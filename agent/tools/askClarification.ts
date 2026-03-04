// TODO: Phase 4 — AskClarification tool (Human-in-the-Loop)
// 1 question if prompt has genre + platform
// Up to 5 questions if prompt is vague
// Questions target: platforms, region, mood/genre, runtime, content rating

import { z } from 'zod';

export const askClarificationSchema = z.object({
  prompt: z.string().describe('The user prompt to generate clarifying questions for'),
});

export type AskClarificationInput = z.infer<typeof askClarificationSchema>;

export interface ClarificationQuestion {
  question: string;
  options: string[];
}

export interface AskClarificationOutput {
  questions: ClarificationQuestion[];
}

export async function askClarification(
  _input: AskClarificationInput
): Promise<AskClarificationOutput> {
  throw new Error('Not implemented — Phase 4');
}
