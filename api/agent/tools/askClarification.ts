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

export const askClarificationSchema = z.object({
  prompt: z.string().describe('The user prompt to generate clarifying questions for'),
});

export type AskClarificationInput = z.infer<typeof askClarificationSchema>;

export interface AskClarificationOutput {
  questions: ClarificationQuestion[];
}

const SYSTEM = `You generate clarifying questions for a movie and TV show recommendation chatbot.
Rules:
- If the prompt already mentions genre AND platform, return at most 1 question
- If the prompt is vague, return up to 5 questions
- Never ask about information already given in the prompt
- Each question must have exactly 3–4 short option labels (2–5 words each)
- Topics to ask about: type (movie or show), mood/genre, runtime, content rating, platforms, language
- Return ONLY valid JSON with no markdown fences:
  {"questions": [{"question": "...", "options": ["A", "B", "C"]}]}
- If the prompt is specific enough to search without further input, return {"questions": []}`;

export async function askClarification(
  input: AskClarificationInput
): Promise<AskClarificationOutput> {
  const llm = getLLM();

  const response = await llm.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(input.prompt),
  ]);

  const parsed = JSON.parse(extractJson(response.content));
  const questions: ClarificationQuestion[] = (parsed.questions ?? []).map(
    (q: { question: string; options: string[] }) => ({
      question: String(q.question),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
    })
  );
  return { questions };
}
