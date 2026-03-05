// OMDb content search — env: CONTENT_API_KEY
// Flow:
//   1. Search endpoint (?s=keyword) → up to 5 candidate titles
//   2. Detail endpoint (?i=imdbID) per candidate → enriched metadata
//   3. Post-filter by year, rating, runtime, certification
// Always include_adult=false (OMDb default).

import { z } from 'zod';

export const searchContentSchema = z.object({
  keyword: z.string().describe('Search keyword derived from user intent e.g. "French thriller"'),
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

async function fetchOmdb(params: Record<string, string>): Promise<Record<string, unknown>> {
  const apiKey = process.env.CONTENT_API_KEY;
  if (!apiKey) throw new Error('CONTENT_API_KEY environment variable is required');

  const base = process.env.CONTENT_API_BASE;
  if (!base) throw new Error('CONTENT_API_BASE environment variable is required');
  const url = new URL(base);
  url.searchParams.set('apikey', apiKey);

  // Some OMDb plans require a fixed `i` identifier sent with every request.
  // Detail lookups pass i=imdbID in params, which will override this below.
  const iKey = process.env.CONTENT_API_IKEY;
  if (iKey) url.searchParams.set('i', iKey);

  // Apply caller params (i=imdbID for detail calls overrides CONTENT_API_IKEY)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  // Debug: log URL with key masked
  const debugUrl = url.toString().replace(apiKey, '***');
  console.log('[OMDb] →', debugUrl);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OMDb API error: ${res.status}`);
  const data = await res.json() as Record<string, unknown>;
  console.log('[OMDb] ←', JSON.stringify(data).slice(0, 600));
  return data;
}

function passesFilters(d: Record<string, unknown>, input: SearchContentInput): boolean {
  const year = parseInt(String(d.Year ?? '0'));
  if (input.yearFrom && year < input.yearFrom) return false;
  if (input.yearTo && year > input.yearTo) return false;

  const rating = parseFloat(String(d.imdbRating ?? '0'));
  if (input.minRating && rating < input.minRating) return false;

  const rawRuntime = String(d.Runtime ?? '');
  const runtime = rawRuntime === 'N/A' ? NaN : parseInt(rawRuntime);
  if (input.runtimeMin && (isNaN(runtime) || runtime < input.runtimeMin)) return false;
  if (input.runtimeMax && (isNaN(runtime) || runtime > input.runtimeMax)) return false;

  if (input.certification) {
    const rated = String(d.Rated ?? '');
    if (rated !== input.certification) return false;
  }

  return true;
}

export async function searchContent(
  input: SearchContentInput
): Promise<ContentResult[]> {
  const omdbType = input.type === 'tv' ? 'series' : 'movie';
  console.log('[OMDb] searching keyword:', input.keyword, '| type:', omdbType);

  const searchData = await fetchOmdb({ s: input.keyword, type: omdbType });

  if (searchData['Response'] === 'False' || !Array.isArray(searchData['Search'])) {
    console.log('[OMDb] search returned no results. Error:', searchData['Error'] ?? 'none');
    return [];
  }

  const candidates = (searchData['Search'] as Array<Record<string, string>>)
    .filter((item) => typeof item.imdbID === 'string' && item.imdbID)
    .slice(0, 5);

  const details = await Promise.all(
    candidates.map((item) =>
      fetchOmdb({ i: item.imdbID, plot: 'short' }).catch(() => null)
    )
  );

  const results: ContentResult[] = [];

  for (const detail of details) {
    if (!detail || detail['Response'] === 'False') continue;
    if (!passesFilters(detail, input)) continue;

    results.push({
      imdbId: String(detail['imdbID'] ?? ''),
      title: String(detail['Title'] ?? ''),
      posterUrl: detail['Poster'] !== 'N/A' ? String(detail['Poster']) : '',
      overview: detail['Plot'] !== 'N/A' ? String(detail['Plot']) : '',
      imdbRating: parseFloat(String(detail['imdbRating'])) || 0,
      year: String(detail['Year'] ?? ''),
      genre: detail['Genre'] !== 'N/A' ? String(detail['Genre']) : '',
      runtime: detail['Runtime'] !== 'N/A' ? String(detail['Runtime']) : '',
    });
  }

  return results;
}
