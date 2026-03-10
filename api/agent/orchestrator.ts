// Agent orchestration
//
// Pre-flight (hand-rolled, deterministic):
//   1. fetchCountryServices — services list for clarification options + platform ID resolution
//   2. guardRailCheck       — always first; blocks NSFW / off-topic
//   3. askClarification     — human-in-the-loop; halts and waits for chip answers
//
// Agent phase (LangChain AgentExecutor):
//   4. AgentExecutor with two tools:
//      - findAvailableContent: searchContent → checkAvailability → AvailableTitle[] JSON
//      - filterResults (optional): LLM post-filter for criteria the API cannot express
//        (mood, tone, age-appropriateness, maturity). Only called when needed.
//   5. Cards emitted at chain end using the last tool output (filtered if filterResults ran)
//
// Chat history from body.history is wired via MessagesPlaceholder for multi-turn context.

import type { VercelResponse } from '@vercel/node';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { guardRailCheck } from './tools/guardRailCheck';
import { askClarification } from './tools/askClarification';
import { fetchCountryServices } from './tools/countryServices';
import { makeSearchTool } from './tools/searchTool';
import { makeFilterTool } from './tools/filterResults';
import { getAgentLLM } from './llm';
import { buildAgentSystemPrompt } from './systemPrompt';
import type { AvailableTitle, AgentEvent, AgentRequestBody } from '../../shared/types';

const REFUSAL =
  "I can only help with finding movies and shows. What would you like to watch?";

function emit(res: VercelResponse, event: AgentEvent) {
  res.write(JSON.stringify(event) + '\n');
}

export async function runOrchestrator(
  body: AgentRequestBody,
  res: VercelResponse
): Promise<void> {
  const {
    message,
    clarificationAnswers, // undefined = first request; {} = user submitted chips (even if empty)
    country = 'US',
    history = [],
  } = body;

  try {
    // ── Fetch country services ───────────────────────────────────────────
    const services = await fetchCountryServices(country).catch(() => []);

    // ── Pre-flight 1: GuardRailCheck ─────────────────────────────────────
    emit(res, { type: 'status', payload: 'Checking request…' });

    const guard = await guardRailCheck({ message });
    if (!guard.allowed) {
      emit(res, { type: 'message', payload: REFUSAL });
      return;
    }

    // ── Pre-flight 2: AskClarification ───────────────────────────────────
    // clarificationAnswers === undefined means first request.
    // Any object (even {}) means the user already submitted chips — skip to search.
    if (clarificationAnswers === undefined) {
      emit(res, { type: 'status', payload: 'Preparing questions…' });

      const { questions } = await askClarification({ prompt: message, services });
      if (questions.length > 0) {
        emit(res, { type: 'questions', payload: questions });
        return; // client re-POSTs with clarificationAnswers to continue
      }
    }

    // ── Agent phase ───────────────────────────────────────────────────────
    emit(res, { type: 'status', payload: 'Searching for content…' });

    const answers = clarificationAnswers ?? {};
    const currentYear = new Date().getFullYear();

    // Build the human input: original message + clarification answers appended
    const inputText = Object.keys(answers).length > 0
      ? `${message}\n\nUser selected:\n${
          Object.entries(answers)
            .map(([q, a]) => `${q}: ${a.join(', ')}`)
            .join('\n')
        }`
      : message;

    // Build chat history from body.history for multi-turn context
    const chatHistory = history.flatMap((msg) =>
      msg.role === 'user'
        ? [new HumanMessage(msg.content)]
        : [new AIMessage(msg.content)]
    );

    const searchTool = makeSearchTool(country, services);
    const filterTool = makeFilterTool();
    const tools = [searchTool, filterTool];

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', buildAgentSystemPrompt(country, services, currentYear, answers)],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);

    const agent = createToolCallingAgent({ llm: getAgentLLM(), tools, prompt });
    const executor = new AgentExecutor({ agent, tools });

    // Collect the last tool output (filterResults overwrites findAvailableContent if called)
    // Emit cards at chain end so the final set (filtered or not) is always used
    let pendingCards: AvailableTitle[] = [];

    const stream = executor.streamEvents(
      { input: inputText, chat_history: chatHistory },
      { version: 'v2' }
    );

    for await (const event of stream) {
      if (
        event.event === 'on_tool_end' &&
        (event.name === 'findAvailableContent' || event.name === 'filterResults')
      ) {
        try {
          const parsed = JSON.parse(event.data.output as string) as AvailableTitle[];
          if (Array.isArray(parsed)) pendingCards = parsed;
        } catch { /* ignore parse errors */ }
      }

      if (event.event === 'on_chain_end' && event.name === 'AgentExecutor') {
        if (pendingCards.length > 0) {
          emit(res, { type: 'cards', payload: pendingCards });
        }

        const output = event.data.output;
        if (typeof output === 'string' && output.trim()) {
          emit(res, { type: 'message', payload: output.trim() });
        } else if (!pendingCards.length) {
          emit(res, { type: 'message', payload: "Nothing found for that. Try widening the search or swapping platforms." });
        }
      }
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
    emit(res, { type: 'error', payload: msg });
  }
}
