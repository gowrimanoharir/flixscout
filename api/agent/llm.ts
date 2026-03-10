// LangChain ChatAnthropic setup
//
// getLLM()      — pre-flight calls (guardRailCheck, askClarification, filters)
//                 1024 tokens; avoids Anthropic's temperature+top_p conflict via workaround
// getAgentLLM() — AgentExecutor search phase; 4096 tokens for tool-call reasoning

import { ChatAnthropic } from '@langchain/anthropic';

let _llm: ChatAnthropic | null = null;
let _agentLlm: ChatAnthropic | null = null;

const apiOptions = {
  model: 'claude-sonnet-4-6',
  topP: 1 as const,             // Anthropic allows only one of temperature/top_p
  invocationKwargs: { temperature: undefined }, // omit temperature so API receives only top_p
} as const;

function makeApiKey(): string {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('LLM_API_KEY environment variable is required');
  return apiKey;
}

export function getLLM(): ChatAnthropic {
  if (_llm) return _llm;
  _llm = new ChatAnthropic({ apiKey: makeApiKey(), ...apiOptions, maxTokens: 1024 });
  return _llm;
}

export function getAgentLLM(): ChatAnthropic {
  if (_agentLlm) return _agentLlm;
  _agentLlm = new ChatAnthropic({ apiKey: makeApiKey(), ...apiOptions, maxTokens: 4096 });
  return _agentLlm;
}
