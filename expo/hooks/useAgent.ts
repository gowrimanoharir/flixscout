import { useState, useRef } from 'react';
import type { AgentEvent, ClarificationQuestion, AvailableTitle } from '@/shared/types';

export type ChatItem =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'assistant'; id: string; text: string }
  | { kind: 'error'; id: string; text: string }
  | { kind: 'clarification'; id: string; questions: ClarificationQuestion[] }
  | { kind: 'cards'; id: string; titles: AvailableTitle[] };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function useAgent(country?: string) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pendingMessageRef = useRef('');

  function handleEvent(event: AgentEvent) {
    switch (event.type) {
      case 'status':
        setStatusText(event.payload as string);
        break;
      case 'message':
        setStatusText(null);
        setItems(prev => [...prev, { kind: 'assistant', id: uid(), text: event.payload as string }]);
        break;
      case 'questions':
        setStatusText(null);
        setItems(prev => [...prev, {
          kind: 'clarification',
          id: uid(),
          questions: event.payload as ClarificationQuestion[],
        }]);
        break;
      case 'cards':
        setStatusText(null);
        setItems(prev => [...prev, {
          kind: 'cards',
          id: uid(),
          titles: event.payload as AvailableTitle[],
        }]);
        break;
      case 'error':
        setStatusText(null);
        setItems(prev => [...prev, { kind: 'error', id: uid(), text: event.payload as string }]);
        break;
    }
  }

  async function send(message: string, clarificationAnswers?: Record<string, string[]>) {
    if (!clarificationAnswers) {
      pendingMessageRef.current = message;
      setItems(prev => [...prev, { kind: 'user', id: uid(), text: message }]);
    }

    setIsLoading(true);
    setStatusText(null);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: [],
          clarificationAnswers,
          country,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server error (${res.status}). Please try again.`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (typeof event?.type === 'string' && 'payload' in event) {
              handleEvent(event as AgentEvent);
            }
          } catch { /* skip malformed line */ }
        }
      }
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          if (typeof event?.type === 'string' && 'payload' in event) {
            handleEvent(event as AgentEvent);
          }
        } catch { /* skip */ }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setItems(prev => [...prev, { kind: 'error', id: uid(), text: msg }]);
    } finally {
      setIsLoading(false);
      setStatusText(null);
    }
  }

  function submitClarification(answers: Record<string, string[]>) {
    const summary = Object.values(answers).flat().filter(Boolean).join(' · ');
    setItems(prev => {
      const withoutChips = prev.filter(item => item.kind !== 'clarification');
      return summary
        ? [...withoutChips, { kind: 'user', id: uid(), text: summary }]
        : withoutChips;
    });
    send(pendingMessageRef.current, answers);
  }

  return { items, statusText, isLoading, send, submitClarification };
}
