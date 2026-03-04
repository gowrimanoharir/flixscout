// RapidAPI Streaming Availability (Movie of the Night) — env: STREAMING_API_KEY
// API: https://streaming-availability.p.rapidapi.com/shows/{imdbId}?country=<code>
// Fetches each title concurrently, filters by requested platforms.
// Titles not streamable on any requested platform are silently dropped.

import { z } from 'zod';
import type { AvailableTitle } from '../../../shared/types';

export const checkAvailabilitySchema = z.object({
  imdbIds: z.array(z.string()).describe('IMDb IDs from OMDb results'),
  country: z.string().describe('ISO 3166-1 alpha-2 country code e.g. "CA"'),
  platforms: z.array(z.string()).describe('Platform slugs e.g. ["netflix","prime"]'),
});

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;
export type { AvailableTitle };

interface StreamingOption {
  service: { id: string; name: string };
  type: string;
  link: string;
  videoQuality?: string;
  audios?: Array<{ language: string }>;
}

async function fetchAvailability(
  imdbId: string,
  country: string,
  apiKey: string
): Promise<Record<string, unknown> | null> {
  const base = process.env.STREAMING_API_BASE;
  if (!base) throw new Error('STREAMING_API_BASE environment variable is required');

  const host = new URL(base).hostname;
  const url = `${base}/shows/${imdbId}?country=${country.toLowerCase()}`;

  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': host,
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Streaming API error: ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

function extractOptions(
  data: Record<string, unknown>,
  country: string,
  platforms: string[]
): StreamingOption[] {
  const countryKey = country.toLowerCase();
  const raw = data['streamingOptions'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];

  const byCountry = (raw as Record<string, unknown>)[countryKey];
  if (!Array.isArray(byCountry)) return [];

  const options = byCountry.filter(
    (o): o is StreamingOption =>
      !!o && typeof o === 'object' && typeof (o as StreamingOption).service?.id === 'string'
  );

  if (!platforms.length) return options;

  return options.filter((opt) =>
    platforms.some((p) => opt.service.id.toLowerCase() === p.toLowerCase())
  );
}

export async function checkAvailability(
  input: CheckAvailabilityInput
): Promise<AvailableTitle[]> {
  const apiKey = process.env.STREAMING_API_KEY;
  if (!apiKey) throw new Error('STREAMING_API_KEY environment variable is required');

  const { imdbIds, country, platforms } = input;

  const results = await Promise.all(
    imdbIds.map((id) => fetchAvailability(id, country, apiKey).catch(() => null))
  );

  const available: AvailableTitle[] = [];

  for (let i = 0; i < results.length; i++) {
    const data = results[i];
    if (!data) continue;

    const options = extractOptions(data, country, platforms);
    if (!options.length) continue;

    // Use the first matching option for the primary streaming info
    const primary = options[0];

    available.push({
      imdbId: imdbIds[i],
      title: String(data['title'] ?? ''),
      platform: primary.service.name,
      streamUrl: primary.link,
      audioLanguages: (primary.audios ?? []).map((a) => a.language),
      videoQuality: primary.videoQuality ?? 'sd',
    });
  }

  return available;
}
