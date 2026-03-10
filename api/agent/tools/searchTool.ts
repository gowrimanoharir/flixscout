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
  keyword: z.string().optional().describe(
    'Word or phrase that appears in a title or description (e.g. "zombie", "heist"). Omit if the request is fully captured by other fields.'
  ),
  type: z.enum(['movie', 'tv']).describe('Content type: movie or tv series'),
  genres: z.array(z.string()).optional().describe(
    'Genre slugs. Valid values: action, adventure, animation, comedy, crime, documentary, drama, fantasy, history, horror, music, mystery, romance, science-fiction, sport, thriller, war, western'
  ),
  language: z.string().optional().describe(
    'ISO 639-1 original language code (e.g. "fr" for French, "ko" for Korean). Omit for multilingual countries.'
  ),
  minRating: z.number().optional().describe('Minimum IMDb rating (0–10 scale)'),
  yearFrom: z.number().optional().describe('Earliest release year'),
  yearTo: z.number().optional().describe('Latest release year'),
  runtimeMin: z.number().optional().describe('Minimum runtime in minutes'),
  runtimeMax: z.number().optional().describe('Maximum runtime in minutes'),
  platforms: z.array(z.string()).optional().describe(
    'Service names as mentioned by the user (e.g. "Netflix", "Prime Video"). System resolves to IDs.'
  ),
});

export function makeSearchTool(country: string, services: ServiceOption[]) {
  return tool(
    async (input) => {
      const resolvedPlatforms = resolveToServiceIds(input.platforms ?? [], services);
      console.log('[SearchTool] resolved platforms:', resolvedPlatforms);

      const results = await searchContent({
        keyword: input.keyword,
        type: input.type,
        genres: input.genres,
        language: input.language,
        minRating: input.minRating,
        yearFrom: input.yearFrom,
        yearTo: input.yearTo,
        country,
        platforms: resolvedPlatforms,
      });

      const available = checkAvailability({
        results,
        country,
        platforms: resolvedPlatforms,
        runtimeMin: input.runtimeMin,
        runtimeMax: input.runtimeMax,
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
