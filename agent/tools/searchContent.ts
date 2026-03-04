// TODO: Phase 4 — SearchContent tool (OMDb API)
// OMDb search endpoint: omdbapi.com/?s=<keyword>
// Construct keyword from intent (e.g. "French thriller"), post-filter by year/rating/type
// Always include_adult=false. Returns top 10 with IMDb IDs.

import { z } from 'zod';

export const searchContentSchema = z.object({
  genres: z.array(z.string()).optional().describe('Genre list e.g. ["Action","Comedy"]'),
  language: z.string().optional().describe('ISO language code e.g. "fr" for French'),
  certification: z.enum(['G', 'PG', 'PG-13', 'R']).optional(),
  runtimeMin: z.number().optional(),
  runtimeMax: z.number().optional(),
  minRating: z.number().optional(),
  yearFrom: z.number().optional(),
  yearTo: z.number().optional(),
  type: z.enum(['movie', 'tv']),
});

export type SearchContentInput = z.infer<typeof searchContentSchema>;

export interface ContentResult {
  imdbId: string;
  title: string;
  posterUrl: string;
  overview: string;
  imdbRating: number;
  year: string;
  genre: string;
  runtime: string;
}

export async function searchContent(
  _input: SearchContentInput
): Promise<ContentResult[]> {
  throw new Error('Not implemented — Phase 4');
}
