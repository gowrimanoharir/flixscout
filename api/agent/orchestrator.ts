// Agent orchestration — sequences the four tools in plain TypeScript
//
// Flow:
//   1. GuardRailCheck   — always first, blocks NSFW / off-topic
//   2. AskClarification — human-in-the-loop, halts and waits for chip answers
//   3. SearchContent + CheckAvailability — run in parallel
//
// Each step emits NDJSON events via the emit() helper.

import type { VercelResponse } from '@vercel/node';
import { guardRailCheck } from './tools/guardRailCheck';
import { askClarification } from './tools/askClarification';
import { searchContent } from './tools/searchContent';
import { checkAvailability } from './tools/checkAvailability';
import { buildSearchFilters } from './filters';
import type { AgentEvent, AgentRequestBody } from '../../shared/types';

const REFUSAL =
  "I can only help with finding movies and shows. What would you like to watch?";

const NO_RESULTS =
  "Nothing found on your platforms for that. Try widening the search or adding more platforms.";

function emit(res: VercelResponse, event: AgentEvent) {
  res.write(JSON.stringify(event) + '\n');
}

export async function runOrchestrator(
  body: AgentRequestBody,
  res: VercelResponse
): Promise<void> {
  const {
    message,
    clarificationAnswers = {},
    country = 'US',
    platforms = [],
  } = body;

  try {
    // ── Step 1: GuardRailCheck ───────────────────────────────────────────
    emit(res, { type: 'status', payload: 'Checking request…' });

    const guard = await guardRailCheck({ message });

    if (!guard.allowed) {
      emit(res, { type: 'message', payload: REFUSAL });
      return;
    }

    // ── Step 2: AskClarification (skip if answers already provided) ──────
    const hasClarification = Object.keys(clarificationAnswers).length > 0;

    if (!hasClarification) {
      emit(res, { type: 'status', payload: 'Preparing questions…' });

      const { questions } = await askClarification({ prompt: message });

      if (questions.length > 0) {
        emit(res, { type: 'questions', payload: questions });
        return; // client re-POSTs with clarificationAnswers to continue
      }
    }

    // ── Step 3: SearchContent → CheckAvailability ───────────────────────
    // Sequential: availability check needs the IMDb IDs from the search first
    emit(res, { type: 'status', payload: 'Searching for content…' });

    const filters = await buildSearchFilters(message, clarificationAnswers);
    const results = await searchContent(filters);

    if (!results.length) {
      emit(res, { type: 'message', payload: NO_RESULTS });
      return;
    }

    emit(res, { type: 'status', payload: 'Checking streaming availability…' });

    const imdbIds = results.map((r) => r.imdbId);
    const available = await checkAvailability({ imdbIds, country, platforms });

    if (!available.length) {
      emit(res, { type: 'message', payload: NO_RESULTS });
      return;
    }

    // Enrich confirmed-available titles with poster/metadata from search results
    const enriched = available.map((title) => {
      const meta = results.find((r) => r.imdbId === title.imdbId);
      return meta ? { ...title, ...meta } : title;
    });

    emit(res, { type: 'cards', payload: enriched });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
    emit(res, { type: 'error', payload: msg });
  }
}
