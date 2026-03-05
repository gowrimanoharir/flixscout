// Parses user message + clarification answers into structured search filters
// using Claude intent extraction. country and platforms are added by the orchestrator.

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getLLM } from './llm';
import { extractJson } from './utils';
import { INTENT_EXTRACTION_PROMPT } from './systemPrompt';
import type { SearchContentInput } from './tools/searchContent';

export interface SearchFilters extends Omit<SearchContentInput, 'country' | 'platforms'> {
  runtimeMin?: number;
  runtimeMax?: number;
  platforms?: string[]; // service slugs extracted from message/clarification answers
}

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
): Promise<SearchFilters> {
  const llm = getLLM();
  const currentYear = new Date().getFullYear();
  const systemPrompt = `${INTENT_EXTRACTION_PROMPT}\n\nCurrent year: ${currentYear}. Use this for all relative date expressions (e.g. "last 3 years" → yearFrom = ${currentYear - 3}, "this year" → yearFrom = ${currentYear}, "last month" → yearFrom = ${currentYear}).`;

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(buildUserMessage(message, clarificationAnswers)),
  ]);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJson(response.content));
  } catch {
    console.error('[Filters] LLM response unparseable:', JSON.stringify(response.content).slice(0, 500));
    throw new Error('Failed to parse intent from LLM response. Please try again.');
  }

  return {
    keyword: parsed.keyword ? String(parsed.keyword) : undefined,
    type: parsed.type === 'tv' ? 'tv' : 'movie',
    genres: Array.isArray(parsed.genres) ? parsed.genres.map(String) : undefined,
    language: parsed.language ? String(parsed.language) : undefined,
    minRating: typeof parsed.minRating === 'number' ? parsed.minRating : undefined,
    yearFrom: typeof parsed.yearFrom === 'number' ? parsed.yearFrom : undefined,
    yearTo: typeof parsed.yearTo === 'number' ? parsed.yearTo : undefined,
    runtimeMin: typeof parsed.runtimeMin === 'number' ? parsed.runtimeMin : undefined,
    runtimeMax: typeof parsed.runtimeMax === 'number' ? parsed.runtimeMax : undefined,
    platforms: Array.isArray(parsed.platforms) ? parsed.platforms.map(String) : undefined,
  };
}
