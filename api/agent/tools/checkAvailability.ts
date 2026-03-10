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

const PREFERRED_TYPES = new Set(['subscription', 'free']);

function pickOption(
  streamingOptions: Record<string, StreamingOption[]>,
  country: string,
  platforms: string[]
): { option: StreamingOption; isAddon: boolean } | null {
  const all = streamingOptions[country.toLowerCase()];
  if (!Array.isArray(all) || !all.length) return null;

  const preferred = all.filter((opt) => PREFERRED_TYPES.has(opt.type));
  const addons    = all.filter((opt) => opt.type === 'addon');

  // Helper: find matching platform in a candidate list
  function findMatch(candidates: StreamingOption[]) {
    if (!platforms.length) return candidates[0] ?? null;
    return candidates.find((opt) =>
      platforms.some((p) => opt.service.id.toLowerCase() === p.toLowerCase())
    ) ?? null;
  }

  const match = findMatch(preferred);
  if (match) return { option: match, isAddon: false };

  const addonMatch = findMatch(addons);
  if (addonMatch) return { option: addonMatch, isAddon: true };

  return null;
}

export function checkAvailability(input: CheckAvailabilityInput): AvailableTitle[] {
  const { results, country, platforms, runtimeMin, runtimeMax } = input;

  if (results.length > 0) {
    console.log('[Availability] first result streamingOptions:', JSON.stringify(results[0].streamingOptions).slice(0, 500));
    console.log('[Availability] filtering for country:', country.toLowerCase(), '| platforms:', platforms);
  }

  const available: Array<AvailableTitle & { _rating: number; _isAddon: boolean }> = [];

  for (const result of results) {
    if (!result.imdbId) continue;

    // Post-filter by runtime (skip unknowns only when a limit is specified)
    if (runtimeMin != null && (result.runtime === 0 || result.runtime < runtimeMin)) continue;
    if (runtimeMax != null && (result.runtime === 0 || result.runtime > runtimeMax)) continue;

    const picked = pickOption(result.streamingOptions, country, platforms);
    if (!picked) continue;

    const { option, isAddon } = picked;
    const platformLabel = isAddon ? `${option.service.name} (add-on)` : option.service.name;

    available.push({
      imdbId: result.imdbId,
      title: result.title,
      platform: platformLabel,
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
      _isAddon: isAddon,
    });
  }

  // Subscription/free titles first (sorted by rating), add-ons fill remaining slots only
  return available
    .sort((a, b) => {
      if (a._isAddon !== b._isAddon) return a._isAddon ? 1 : -1;
      return b._rating - a._rating;
    })
    .slice(0, 5)
    .map(({ _rating, _isAddon, ...title }) => title);
}
