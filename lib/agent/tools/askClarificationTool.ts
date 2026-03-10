// LangChain tool used by IntentAgent to ask the user clarifying questions.
// The IntentAgent LLM generates the questions as tool parameters — no second LLM call needed.
// The orchestrator catches the on_tool_end event, emits the questions, and halts the stream.

import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import type { ClarificationQuestion } from '../../../shared/types';
import type { ServiceOption } from './countryServices';

const questionSchema = z.object({
  question: z.string().describe('The clarifying question to ask'),
  options: z.array(z.string()).min(3).max(5).describe('3–5 short option labels (2–5 words each)'),
  multiSelect: z.boolean().optional().describe(
    'true if the user can pick multiple options; false for mutually exclusive choice'
  ),
});

const askClarificationSchema = z.object({
  questions: z.array(questionSchema).min(1).max(5).describe(
    'Clarifying questions: up to 5 for vague requests, at most 1 if genre AND platform are already known'
  ),
});

export function makeAskClarificationTool(services: ServiceOption[]) {
  const platformList = services.length
    ? services.map((s) => s.name).join(', ')
    : 'see conversation context';

  return tool(
    async (input) => {
      const questions: ClarificationQuestion[] = input.questions.map((q) => ({
        question: q.question,
        options: q.options,
        multiSelect: q.multiSelect !== false,
      }));
      return JSON.stringify(questions);
    },
    {
      name: 'askClarification',
      description: [
        'Ask the user clarifying questions when information is missing. Up to 5 questions for vague requests; at most 1 if genre AND platform are already known.',
        '',
        'NEVER call this tool if ANY of the following are true:',
        '- Platforms appear anywhere in conversation history → reuse them, do not ask',
        '- User said "movies or series", "either", "both", or "doesn\'t matter" → show_type is null, no question needed',
        '- Message is a follow-up refinement: "reduce the rating", "add Disney+", "something newer", "without subtitles", "try without rating", "only movies", "include series"',
        '- User is reacting to results: "nothing I like", "something else", "more like the first one"',
        '- Enough context exists for a reasonable search (genre + approximate type is sufficient)',
        '- The same question was already answered in a prior turn',
        '',
        `Available platforms for this user: ${platformList}`,
        'When asking about platforms, pick only the 3–5 most popular ones from the list above.',
        'Set multiSelect: false for content type (movie/show) and language — these are exclusive choices.',
        'Set multiSelect: true for platforms, genres, and mood — multiple selections are valid.',
      ].join('\n'),
      schema: askClarificationSchema,
    }
  );
}
