// Parses user message + clarification answers into structured SearchContent filters
// using Claude intent extraction. Replaces the previous keyword-only approach.

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getLLM } from './llm';
import { extractJson } from './utils';
import { INTENT_EXTRACTION_PROMPT } from './systemPrompt';
import type { SearchContentInput } from './tools/searchContent';

function buildUserMessage(
  message: string,
  clarificationAnswers: Record<string, string[]>
): string {
  const hasAnswers = Object.keys(clarificationAnswers).length > 0;

  if (!hasAnswers) return message;

  const answerLines = Object.entries(clarificationAnswers)
    .map(([question, answers]) => `${question}: ${answers.join(', ')}`)
    .join('\n');

  return `${message}\n\nClarification answers:\n${answerLines}`;
}

export async function buildSearchFilters(
  message: string,
  clarificationAnswers: Record<string, string[]>
): Promise<SearchContentInput> {
  const llm = getLLM();

  const response = await llm.invoke([
    new SystemMessage(INTENT_EXTRACTION_PROMPT),
    new HumanMessage(buildUserMessage(message, clarificationAnswers)),
  ]);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJson(response.content));
  } catch {
    throw new Error('Failed to parse intent from LLM response. Please try again.');
  }

  return {
    keyword: String(parsed.keyword ?? message.trim()),
    type: parsed.type === 'tv' ? 'tv' : 'movie',
    genres: Array.isArray(parsed.genres) ? parsed.genres.map(String) : undefined,
    language: parsed.language ? String(parsed.language) : undefined,
    certification: (['G', 'PG', 'PG-13', 'R'] as const).includes(parsed.certification as 'G')
      ? (parsed.certification as 'G' | 'PG' | 'PG-13' | 'R')
      : undefined,
    runtimeMin: typeof parsed.runtimeMin === 'number' ? parsed.runtimeMin : undefined,
    runtimeMax: typeof parsed.runtimeMax === 'number' ? parsed.runtimeMax : undefined,
    minRating: typeof parsed.minRating === 'number' ? parsed.minRating : undefined,
    yearFrom: typeof parsed.yearFrom === 'number' ? parsed.yearFrom : undefined,
    yearTo: typeof parsed.yearTo === 'number' ? parsed.yearTo : undefined,
  };
}
