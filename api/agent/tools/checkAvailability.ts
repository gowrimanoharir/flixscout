// Pure formatter — no API call.
// Receives raw ContentResult[] from searchContent (which already includes streaming options),
// post-filters by runtime, filters to titles available on the requested platforms in the
// given country, sorts by rating descending, and returns the top 5 as AvailableTitle[].

import type { AvailableTitle } from '../../../shared/types';
import type { ContentResult, StreamingOption } from './searchContent';

export interface CheckAvailabilityInput {
  results: ContentResult[];
  country: string;
  platforms: string[];
  runtimeMin?: number; // minutes
  runtimeMax?: number; // minutes
}

export type { AvailableTitle };

function pickOption(
  streamingOptions: Record<string, StreamingOption[]>,
  country: string,
  platforms: string[]
): StreamingOption | null {
  const options = streamingOptions[country.toLowerCase()];
  if (!Array.isArray(options) || !options.length) return null;

  if (!platforms.length) return options[0];

  return (
    options.find((opt) =>
      platforms.some((p) => opt.service.id.toLowerCase() === p.toLowerCase())
    ) ?? null
  );
}

export function checkAvailability(input: CheckAvailabilityInput): AvailableTitle[] {
  const { results, country, platforms, runtimeMin, runtimeMax } = input;

  if (results.length > 0) {
    console.log('[Availability] first result streamingOptions:', JSON.stringify(results[0].streamingOptions).slice(0, 500));
    console.log('[Availability] filtering for country:', country.toLowerCase(), '| platforms:', platforms);
  }

  const available: Array<AvailableTitle & { _rating: number }> = [];

  for (const result of results) {
    if (!result.imdbId) continue;

    // Post-filter by runtime (skip unknowns only when a limit is specified)
    if (runtimeMin != null && (result.runtime === 0 || result.runtime < runtimeMin)) continue;
    if (runtimeMax != null && (result.runtime === 0 || result.runtime > runtimeMax)) continue;

    const option = pickOption(result.streamingOptions, country, platforms);
    if (!option) continue;

    available.push({
      imdbId: result.imdbId,
      title: result.title,
      platform: option.service.name,
      streamUrl: option.link,
      audioLanguages: (option.audios ?? []).map((a) => a.language),
      videoQuality: option.videoQuality ?? 'sd',
      posterUrl: result.posterUrl,
      overview: result.overview,
      imdbRating: result.rating / 10, // convert 0–100 → 0–10
      year: result.year,
      genre: result.genres,
      runtime: result.runtime > 0 ? `${result.runtime} min` : '',
      _rating: result.rating,
    });
  }

  return available
    .sort((a, b) => b._rating - a._rating)
    .slice(0, 5)
    .map(({ _rating, ...title }) => title);
}
