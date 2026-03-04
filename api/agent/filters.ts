// Builds SearchContent input filters from the user's message + clarification answers.
// TODO: Phase 5 — replace basic keyword extraction with Claude-assisted intent parsing.

import type { SearchContentInput } from './tools/searchContent';

export function buildSearchFilters(
  message: string,
  clarificationAnswers: Record<string, string[]>
): SearchContentInput {
  const lower = message.toLowerCase();

  const type: 'movie' | 'tv' =
    lower.includes('show') || lower.includes('series') || lower.includes('tv')
      ? 'tv'
      : 'movie';

  const runtimeAnswer = clarificationAnswers['How long do you have?']?.[0] ?? '';
  const runtimeMax =
    runtimeAnswer.includes('Under 90') ? 90 :
    runtimeAnswer.includes('90–120') ? 120 :
    undefined;
  const runtimeMin = runtimeAnswer.includes('Under 90') ? 0 : undefined;

  const ratingAnswer = clarificationAnswers['Any rating preference?']?.[0] ?? '';
  const certification =
    ratingAnswer === 'PG-13' ? 'PG-13' :
    ratingAnswer === 'R' ? 'R' :
    ratingAnswer === 'PG' ? 'PG' :
    ratingAnswer === 'G' ? 'G' :
    undefined;

  return { keyword: message.trim(), type, runtimeMin, runtimeMax, certification };
}
