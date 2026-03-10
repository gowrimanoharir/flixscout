// Human-in-the-loop clarification questions via Claude.
// Rules:
//   - 1 question if the prompt already mentions genre AND platform
//   - Up to 5 questions if the prompt is vague
//   - Topics: type (movie/show), mood/genre, runtime, content rating, platforms, language
// Returns empty array if the prompt is already specific enough.

import { z } from 'zod';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getLLM } from '../llm';
import { extractJson } from '../utils';
import type { ClarificationQuestion } from '../../../shared/types';
import type { ServiceOption } from './countryServices';
import { SYSTEM_PROMPT } from '../systemPrompt';

export const askClarificationSchema = z.object({
  prompt: z.string().describe('The user prompt to generate clarifying questions for'),
  services: z.array(z.object({ id: z.string(), name: z.string() })).optional()
    .describe('Streaming services available in the user\'s country'),
});

export type AskClarificationInput = z.infer<typeof askClarificationSchema>;

export interface AskClarificationOutput {
  questions: ClarificationQuestion[];
}

function buildSystem(services: ServiceOption[]): string {
  const servicesSection = services.length
    ? `## Available streaming services for this user\n${services.map((s) => `- ${s.name}`).join('\n')}\n\n`
    : '';

  return `${SYSTEM_PROMPT}

## Current task: generate clarifying questions
${servicesSection}## Rules
- If the prompt already mentions genre AND platform, return at most 1 question
- If the prompt is vague, return up to 5 questions
- Never ask about information already given in the prompt
- Each question must have exactly 3–5 short option labels (2–5 words each)
- Topics to ask about: type (movie or show), mood/genre, runtime, content rating, platforms, language
- When asking about platforms, pick the 3–5 most popular ones from the available services list above
- Return ONLY valid JSON with no markdown fences:
  {"questions": [{"question": "...", "options": ["A", "B", "C"], "multiSelect": true}]}
- Set "multiSelect": false for questions where only one answer makes sense (language, content type). Set "multiSelect": true for questions where multiple answers are valid (platforms, genres, mood).
- If the prompt is specific enough to search without further input, return {"questions": []}
- ALWAYS return {"questions": []} when the user names a specific title or asks "where can I watch X" — they want to discover available platforms, so never ask for platform or any other clarification`;
}

export async function askClarification(
  input: AskClarificationInput
): Promise<AskClarificationOutput> {
  const llm = getLLM();

  const response = await llm.invoke([
    new SystemMessage(buildSystem((input.services as ServiceOption[]) ?? [])),
    new HumanMessage(input.prompt),
  ]);

  const parsed = JSON.parse(extractJson(response.content));
  const questions: ClarificationQuestion[] = (parsed.questions ?? []).map(
    (q: { question: string; options: string[]; multiSelect?: boolean }) => ({
      question: String(q.question),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      multiSelect: q.multiSelect !== false, // default true unless explicitly false
    })
  );
  return { questions };
}
