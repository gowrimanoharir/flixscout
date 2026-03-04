// TODO: Phase 4 — GuardRailCheck tool
// Keyword blocklist for obvious NSFW terms
// Claude semantic classifier for edge cases
// Returns immediately — no external API calls

import { z } from 'zod';

export const guardRailCheckSchema = z.object({
  message: z.string().describe('The user message to validate'),
});

export type GuardRailCheckInput = z.infer<typeof guardRailCheckSchema>;

export interface GuardRailCheckOutput {
  allowed: boolean;
  reason?: string;
}

export async function guardRailCheck(
  _input: GuardRailCheckInput
): Promise<GuardRailCheckOutput> {
  throw new Error('Not implemented — Phase 4');
}
