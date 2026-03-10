// SearchAgent — receives confirmed search intent and finds matching content.
// Uses getAgentLLM() (4096 tokens). Tools: findAvailableContent + filterResults.
//
// pendingCards is owned here and exposed via accumulateCards / replaceCards / getPendingCards
// so the orchestrator can update it from stream events while the closure in filterTool
// always reads the live value.

import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { getAgentLLM } from './llm';
import { makeSearchTool } from './tools/searchTool';
import { makeFilterTool } from './tools/filterResults';
import { buildAgentSystemPrompt } from './systemPrompt';
import type { ServiceOption } from './tools/countryServices';
import type { AvailableTitle } from '../../shared/types';

export interface SearchAgentHandle {
  executor: AgentExecutor;
  getPendingCards: () => AvailableTitle[];
  accumulateCards: (cards: AvailableTitle[]) => void;
  replaceCards: (cards: AvailableTitle[]) => void;
}

export function makeSearchAgent(
  country: string,
  services: ServiceOption[],
  currentYear: number,
  clarificationAnswers: Record<string, string[]>,
): SearchAgentHandle {
  // Declared before makeFilterTool so the closure captures the live variable
  let pendingCards: AvailableTitle[] = [];

  const searchTool = makeSearchTool(country, services);
  const filterTool = makeFilterTool(() => pendingCards);
  const tools = [searchTool, filterTool];

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', buildAgentSystemPrompt(country, services, currentYear, clarificationAnswers)],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);

  const agent = createToolCallingAgent({ llm: getAgentLLM(), tools, prompt });
  const executor = new AgentExecutor({ agent, tools, maxIterations: 5 });

  return {
    executor,
    getPendingCards: () => pendingCards,
    accumulateCards: (cards: AvailableTitle[]) => {
      const seen = new Set(pendingCards.map((c) => c.imdbId));
      pendingCards = [...pendingCards, ...cards.filter((c) => !seen.has(c.imdbId))];
    },
    replaceCards: (cards: AvailableTitle[]) => {
      pendingCards = cards;
    },
  };
}
