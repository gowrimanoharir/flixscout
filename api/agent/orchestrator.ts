// Agent orchestration — sequences the four tools in plain TypeScript
//
// Flow:
//   1. Fetch country services (needed for clarification options + platform slug resolution)
//   2. GuardRailCheck   — always first, blocks NSFW / off-topic
//   3. AskClarification — human-in-the-loop, halts and waits for chip answers
//   4. SearchContent    — single API call returns results + streaming options
//   5. CheckAvailability — sync formatter: post-filter runtime, filter by platform, top 5 by rating
//
// Platform resolution: service names from LLM extraction and clarification answers are both
// matched against the country's service list (from /countries API) to get the correct service id.

import type { VercelResponse } from '@vercel/node';
import { guardRailCheck } from './tools/guardRailCheck';
import { askClarification } from './tools/askClarification';
import { searchContent } from './tools/searchContent';
import { checkAvailability } from './tools/checkAvailability';
import { fetchCountryServices } from './tools/countryServices';
import { buildSearchFilters } from './filters';
import type { ServiceOption } from './tools/countryServices';
import type { AgentEvent, AgentRequestBody } from '../../shared/types';

const REFUSAL =
  "I can only help with finding movies and shows. What would you like to watch?";

const NO_RESULTS =
  "Nothing found on your platforms for that. Try widening the search or adding more platforms.";

function emit(res: VercelResponse, event: AgentEvent) {
  res.write(JSON.stringify(event) + '\n');
}

// Match platform names (from LLM extraction or clarification answers) to service IDs
// using the country's service list. Falls back to lowercase of the name if no match found.
function resolveToServiceIds(names: string[], services: ServiceOption[]): string[] {
  const resolved = names
    .map((name) => {
      const lower = name.toLowerCase();
      return (
        services.find(
          (s) => s.name.toLowerCase() === lower || s.id.toLowerCase() === lower
        )?.id ?? null
      );
    })
    .filter((id): id is string => id !== null);
  return [...new Set(resolved)];
}

// Check all clarification answer values against the service list to pick up platform selections
function platformsFromAnswers(
  answers: Record<string, string[]>,
  services: ServiceOption[]
): string[] {
  return resolveToServiceIds(Object.values(answers).flat(), services);
}

export async function runOrchestrator(
  body: AgentRequestBody,
  res: VercelResponse
): Promise<void> {
  const {
    message,
    clarificationAnswers, // undefined = first request; {} = user submitted chips (even if empty)
    country = 'US',
  } = body;

  try {
    // ── Fetch country services ───────────────────────────────────────────
    // Used for: (a) platform chip options in clarification, (b) name→id resolution
    const services = await fetchCountryServices(country).catch(() => []);

    // ── Step 1: GuardRailCheck ───────────────────────────────────────────
    emit(res, { type: 'status', payload: 'Checking request…' });

    const guard = await guardRailCheck({ message });

    if (!guard.allowed) {
      emit(res, { type: 'message', payload: REFUSAL });
      return;
    }

    // ── Step 2: AskClarification (skip if user already submitted chip answers) ──
    // clarificationAnswers === undefined means first request; any object (even {}) means
    // the user has already seen and submitted the clarification step — proceed to search.
    if (clarificationAnswers === undefined) {
      emit(res, { type: 'status', payload: 'Preparing questions…' });

      const { questions } = await askClarification({ prompt: message, services });

      if (questions.length > 0) {
        emit(res, { type: 'questions', payload: questions });
        return; // client re-POSTs with clarificationAnswers to continue
      }
    }

    // ── Step 3: SearchContent ────────────────────────────────────────────
    emit(res, { type: 'status', payload: 'Searching for content…' });

    const answers = clarificationAnswers ?? {};

    const { runtimeMin, runtimeMax, platforms: llmPlatformNames, ...searchFilters } =
      await buildSearchFilters(message, answers);

    // Resolve platform names → service IDs from both LLM extraction and clarification answers
    const platforms = [
      ...resolveToServiceIds(llmPlatformNames ?? [], services),
      ...platformsFromAnswers(answers, services),
    ].filter((id, i, arr) => arr.indexOf(id) === i); // deduplicate

    console.log('[Orchestrator] resolved platforms:', platforms);

    const results = await searchContent({ ...searchFilters, country, platforms });

    // ── Step 4: CheckAvailability (sync formatter) ───────────────────────
    const available = checkAvailability({ results, country, platforms, runtimeMin, runtimeMax });

    if (!available.length) {
      emit(res, { type: 'message', payload: NO_RESULTS });
      return;
    }

    emit(res, { type: 'cards', payload: available });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
    emit(res, { type: 'error', payload: msg });
  }
}
