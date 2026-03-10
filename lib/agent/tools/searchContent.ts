// Streaming Availability /shows/search/filters — env: STREAMING_API_KEY + STREAMING_API_BASE
// One request returns full metadata + confirmed streaming options for the given country/platforms.
// country and platforms are passed in directly from the request body.
// runtimeMin/runtimeMax are NOT sent to the API — post-filtered by checkAvailability.

import { z } from 'zod';

export const searchContentSchema = z.object({
  keyword: z.string().optional().describe('Search keyword e.g. "heist thriller" or "cozy mystery"'),
  genres: z.array(z.string()).optional().describe(
    'Genre slugs from: action, adventure, animation, comedy, crime, documentary, drama, ' +
    'fantasy, history, horror, music, mystery, romance, science-fiction, sport, thriller, war, western'
  ),
  type: z.enum(['movie', 'tv']),
  language: z.string().optional().describe('ISO 639-1 original language code e.g. "fr" for French'),
  minRating: z.number().optional().describe('Min IMDb-style rating 0–10 (converted to 0–100 for the API)'),
  yearFrom: z.number().optional().describe('Earliest release year e.g. 2000'),
  yearTo: z.number().optional().describe('Latest release year e.g. 2023'),
  country: z.string().describe('ISO 3166-1 alpha-2 country code e.g. "US"'),
  platforms: z.array(z.string()).optional().describe('Platform slugs e.g. ["netflix","prime"]'),
});

export type SearchContentInput = z.infer<typeof searchContentSchema>;

export interface StreamingOption {
  service: { id: string; name: string };
  type: string;
  link: string;
  videoQuality?: string;
  audios?: Array<{ language: string }>;
}

export interface ContentResult {
  imdbId: string;
  title: string;
  posterUrl: string;
  overview: string;
  rating: number;   // 0–100 scale
  year: string;
  genres: string;
  runtime: number;  // raw minutes (0 = unknown)
  streamingOptions: Record<string, StreamingOption[]>;
}

export async function searchContent(input: SearchContentInput): Promise<ContentResult[]> {
  const apiKey = process.env.STREAMING_API_KEY;
  if (!apiKey) throw new Error('STREAMING_API_KEY is required');

  const base = process.env.STREAMING_API_BASE;
  if (!base) throw new Error('STREAMING_API_BASE is required');

  const host = new URL(base).hostname;
  const url = new URL(`${base.replace(/\/$/, '')}/shows/search/filters`);

  url.searchParams.set('country', input.country.toLowerCase());
  url.searchParams.set('show_type', input.type === 'tv' ? 'series' : 'movie');
  url.searchParams.set('order_by', 'rating');
  url.searchParams.set('order_direction', 'desc');

  // Send keyword only when no genres are specified — genre+keyword can be too restrictive
  if (input.keyword && !input.genres?.length) url.searchParams.set('keyword', input.keyword);
  if (input.genres?.length) url.searchParams.set('genres', input.genres.join(','));
  if (input.platforms?.length) url.searchParams.set('catalogs', input.platforms.join(','));
  if (input.language) url.searchParams.set('show_original_language', input.language);
  if (input.minRating != null) url.searchParams.set('rating_min', String(Math.round(input.minRating * 10)));
  if (input.yearFrom != null) url.searchParams.set('year_min', String(input.yearFrom));
  if (input.yearTo != null) url.searchParams.set('year_max', String(input.yearTo));

  console.log('[Search] →', url.toString().replace(apiKey, '***'));

  const res = await fetch(url.toString(), {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': host,
    },
  });

  if (!res.ok) throw new Error(`Search API error: ${res.status}`);

  const data = await res.json() as { shows?: unknown[] };
  const count = Array.isArray(data.shows) ? data.shows.length : 0;
  console.log('[Search] ← got', count, 'results');

  if (!Array.isArray(data.shows)) return [];

  return data.shows.slice(0, 20).map((show) => {
    const s = show as Record<string, unknown>;

    const genreList = Array.isArray(s.genres)
      ? (s.genres as Array<{ name: string }>).map((g) => g.name).join(', ')
      : '';

    const imageSet = s.imageSet as Record<string, Record<string, string>> | undefined;
    const poster =
      imageSet?.verticalPoster?.w360 ??
      imageSet?.verticalPoster?.w240 ??
      '';

    return {
      imdbId: String(s.imdbId ?? ''),
      title: String(s.title ?? ''),
      posterUrl: poster,
      overview: String(s.overview ?? ''),
      rating: typeof s.rating === 'number' ? s.rating : 0,
      year: String(s.releaseYear ?? (s as Record<string, unknown>).firstAirYear ?? ''),
      genres: genreList,
      runtime: typeof s.runtime === 'number' ? s.runtime : 0,
      streamingOptions: (s.streamingOptions ?? {}) as Record<string, StreamingOption[]>,
    };
  });
}
