// LangChain tool that wraps the full search pipeline:
//   searchContent (Streaming Availability API) → checkAvailability (formatter)
//
// The tool accepts structured search parameters directly — the AgentExecutor's
// LLM populates them from the user's intent. Platform names are resolved to
// service IDs inside the tool using the per-request services list.

import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import type { ServiceOption } from './countryServices';
import { searchContent } from './searchContent';
import { checkAvailability } from './checkAvailability';

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

const findAvailableContentSchema = z.object({
  keyword: z.string().nullish().describe(
    'Word or phrase that appears in a title or description (e.g. "zombie", "heist"). Omit if the request is fully captured by other fields.'
  ),
  type: z.preprocess(
    (v) => (v === 'show' || v === 'shows' || v === 'series') ? 'tv' : v,
    z.enum(['movie', 'tv'])
  ).describe('Content type: movie or tv series'),
  genres: z.preprocess(
    (v) => typeof v === 'string' ? v.split(',').map((s: string) => s.trim()).filter(Boolean) : v,
    z.array(z.string()).nullish()
  ).describe(
    'Genre slugs. Valid values: action, adventure, animation, comedy, crime, documentary, drama, family, fantasy, history, horror, music, mystery, romance, scifi, thriller, war, western'
  ),
  language: z.string().nullish().describe(
    'ISO 639-1 original language code (e.g. "fr" for French, "ko" for Korean). Omit for multilingual countries.'
  ),
  minRating: z.number().nullish().describe('Minimum IMDb rating (0–10 scale)'),
  yearFrom: z.number().nullish().describe('Earliest release year'),
  yearTo: z.number().nullish().describe('Latest release year'),
  runtimeMin: z.number().nullish().describe('Minimum runtime in minutes'),
  runtimeMax: z.number().nullish().describe('Maximum runtime in minutes'),
  platforms: z.array(z.string()).nullish().describe(
    'Service names as mentioned by the user (e.g. "Netflix", "Prime Video"). System resolves to IDs.'
  ),
});

export function makeSearchTool(country: string, services: ServiceOption[]) {
  return tool(
    async (input) => {
      const resolvedPlatforms = resolveToServiceIds(input.platforms ?? [], services);
      console.log('[SearchTool] resolved platforms:', resolvedPlatforms);

      const results = await searchContent({
        keyword: input.keyword ?? undefined,
        type: input.type,
        genres: input.genres ?? undefined,
        language: input.language ?? undefined,
        minRating: input.minRating ?? undefined,
        yearFrom: input.yearFrom ?? undefined,
        yearTo: input.yearTo ?? undefined,
        country,
        platforms: resolvedPlatforms,
      });

      const available = checkAvailability({
        results,
        country,
        platforms: resolvedPlatforms,
        runtimeMin: input.runtimeMin ?? undefined,
        runtimeMax: input.runtimeMax ?? undefined,
      });

      return JSON.stringify(available);
    },
    {
      name: 'findAvailableContent',
      description:
        'Search for movies or TV shows available on streaming platforms in the user\'s country. ' +
        'Always call this tool before providing any recommendations — never suggest titles from your own knowledge.',
      schema: findAvailableContentSchema,
    }
  );
}
