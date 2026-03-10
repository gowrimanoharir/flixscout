// IntentAgent — decides whether to ask for clarification or proceed to search.
// Uses getLLM() (1024 tokens). Its only tool is askClarificationTool.
//
// When enough context exists: responds with "READY" (no tool call).
// When info is missing: calls askClarificationTool — orchestrator catches the
// on_tool_end event, emits questions to the client, and halts.

import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { getLLM } from './llm';
import { makeAskClarificationTool } from './tools/askClarificationTool';
import { buildIntentSystemPrompt } from './systemPrompt';
import type { ServiceOption } from './tools/countryServices';

export function makeIntentAgent(
  country: string,
  services: ServiceOption[],
  currentYear: number,
): AgentExecutor {
  const clarificationTool = makeAskClarificationTool(services);
  const tools = [clarificationTool];

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', buildIntentSystemPrompt(country, services, currentYear)],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);

  const agent = createToolCallingAgent({ llm: getLLM(), tools, prompt });
  // maxIterations: 2 — one optional tool call + final response is all that's needed
  return new AgentExecutor({ agent, tools, maxIterations: 2 });
}
