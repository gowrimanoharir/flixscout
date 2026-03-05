// LangChain ChatAnthropic setup
// Used by tools that require LLM reasoning:
//   - guardRailCheck (semantic edge-case classification)
//   - askClarification (question generation)
// SearchContent + CheckAvailability are pure HTTP calls — no LLM needed.

import { ChatAnthropic } from '@langchain/anthropic';

let _llm: ChatAnthropic | null = null;

export function getLLM(): ChatAnthropic {
  if (_llm) return _llm;

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('LLM_API_KEY environment variable is required');

  _llm = new ChatAnthropic({
    apiKey,
    model: 'claude-sonnet-4-6',
    maxTokens: 1024,
    topP: 1,  // model allows only one of temperature/top_p; use top_p to avoid default -1
    invocationKwargs: { temperature: undefined },  // omit temperature so API receives only top_p
  });

  return _llm;
}
