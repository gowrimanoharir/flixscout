// TODO: Phase 4 — CheckAvailability tool (streaming availability API — env: STREAMING_API_KEY)
// Confirms which OMDb titles are streamable on user's platforms in their country
// Titles with no availability are silently filtered — never returned to the user

import { z } from 'zod';

export const checkAvailabilitySchema = z.object({
  imdbIds: z.array(z.string()).describe('IMDb IDs from OMDb results'),
  country: z.string().describe('ISO 3166-1 alpha-2 country code e.g. "CA"'),
  platforms: z.array(z.string()).describe('Platform slugs e.g. ["netflix","prime"]'),
});

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;

export interface AvailableTitle {
  imdbId: string;
  title: string;
  platform: string;
  streamUrl: string;
  audioLanguages: string[];
  videoQuality: string;
}

export async function checkAvailability(
  _input: CheckAvailabilityInput
): Promise<AvailableTitle[]> {
  throw new Error('Not implemented — Phase 4');
}
