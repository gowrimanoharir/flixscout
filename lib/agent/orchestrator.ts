// Orchestrator — supervisor that sequences the three pipeline stages.
//
// Stage 1 (always):   guardRailCheck  — blocks NSFW / off-topic; history-aware
// Stage 2 (optional): IntentAgent     — decides clarify vs search; emits questions and halts,
//                                       or outputs "READY" to continue
// Stage 3:            SearchAgent     — finds content and writes assistant reply
//
// clarificationAnswers === undefined → first request; run IntentAgent
// clarificationAnswers any object    → user submitted chips; skip to SearchAgent

import type { VercelResponse } from '@vercel/node';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { guardRailCheck } from './tools/guardRailCheck';
import { fetchCountryServices } from './tools/countryServices';
import { makeIntentAgent } from './intentAgent';
import { makeSearchAgent } from './searchAgent';
import type { AvailableTitle, AgentEvent, AgentRequestBody, ClarificationQuestion } from '../../shared/types';

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

    // ── Stage 1: GuardRailCheck (history-aware) ──────────────────────────
    emit(res, { type: 'status', payload: 'Checking request…' });

    const guard = await guardRailCheck({ message }, history);
    if (!guard.allowed) {
      emit(res, { type: 'message', payload: REFUSAL });
      return;
    }

    // Build chat history for agent context
    const chatHistory = history.flatMap((msg) =>
      msg.role === 'user'
        ? [new HumanMessage(msg.content)]
        : [new AIMessage(msg.content)]
    );

    const currentYear = new Date().getFullYear();

    // ── Stage 2: IntentAgent (clarify or proceed) ────────────────────────
    // Skip when clarificationAnswers is present — user already answered chips
    if (clarificationAnswers === undefined) {
      emit(res, { type: 'status', payload: 'Thinking…' });

      const intentAgent = makeIntentAgent(country, services, currentYear);
      const intentStream = intentAgent.streamEvents(
        { input: message, chat_history: chatHistory },
        { version: 'v2' }
      );

      let questionsEmitted = false;
      for await (const event of intentStream) {
        if (event.event === 'on_tool_end' && event.name === 'askClarification') {
          try {
            const questions = JSON.parse(event.data.output as string) as ClarificationQuestion[];
            if (Array.isArray(questions) && questions.length > 0) {
              emit(res, { type: 'questions', payload: questions });
              questionsEmitted = true;
            }
          } catch { /* ignore parse errors */ }
        }
      }

      if (questionsEmitted) return; // client re-POSTs with clarificationAnswers
    }

    // ── Stage 3: SearchAgent ─────────────────────────────────────────────
    emit(res, { type: 'status', payload: 'Searching for content…' });

    const answers = clarificationAnswers ?? {};

    // Build the human input: original message + clarification answers appended
    const inputText = Object.keys(answers).length > 0
      ? `${message}\n\nUser selected:\n${
          Object.entries(answers)
            .map(([q, a]) => `${q}: ${a.join(', ')}`)
            .join('\n')
        }`
      : message;

    const searchHandle = makeSearchAgent(country, services, currentYear, answers);
    const stream = searchHandle.executor.streamEvents(
      { input: inputText, chat_history: chatHistory },
      { version: 'v2' }
    );

    for await (const event of stream) {
      if (event.event === 'on_tool_error') {
        console.error('[Tool error]', event.name, JSON.stringify(event.data));
      }

      if (event.event === 'on_tool_start') {
        console.log('[Tool input]', event.name, JSON.stringify(event.data?.input));
      }

      if (event.event === 'on_tool_end' && event.name === 'findAvailableContent') {
        try {
          const parsed = JSON.parse(event.data.output as string) as AvailableTitle[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            searchHandle.accumulateCards(parsed);
          }
        } catch { /* ignore parse errors */ }
      }

      if (event.event === 'on_tool_end' && event.name === 'filterResults') {
        try {
          const parsed = JSON.parse(event.data.output as string) as AvailableTitle[];
          if (Array.isArray(parsed)) searchHandle.replaceCards(parsed);
        } catch { /* ignore parse errors */ }
      }

      if (event.event === 'on_chain_end' && event.name === 'AgentExecutor') {
        const cards = searchHandle.getPendingCards();
        if (cards.length > 0) {
          emit(res, { type: 'cards', payload: cards });
        }

        const output = event.data.output;
        if (typeof output === 'string' && output.trim()) {
          emit(res, { type: 'message', payload: output.trim() });
        } else if (!cards.length) {
          emit(res, { type: 'message', payload: "Nothing found for that. Try widening the search or swapping platforms." });
        }
      }
    }

  } catch (err) {
    console.error('[Orchestrator error]', err);
    emit(res, { type: 'error', payload: 'Something went wrong. Please try again.' });
  }
}
