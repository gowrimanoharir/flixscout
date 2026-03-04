// Shared types used by both the API route (server) and Expo app (client)

// ── Chat history ───────────────────────────────────────────────────────────
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ── Streaming event envelope ───────────────────────────────────────────────
// Every line written to the NDJSON stream is one of these
export type AgentEventType = 'status' | 'questions' | 'cards' | 'message' | 'error';

export interface AgentEvent<T = unknown> {
  type: AgentEventType;
  payload: T;
}

// ── Tool payloads ──────────────────────────────────────────────────────────
export interface ClarificationQuestion {
  question: string;
  options: string[];
}

export interface AvailableTitle {
  imdbId: string;
  title: string;
  platform: string;
  streamUrl: string;
  audioLanguages: string[];
  videoQuality: string;
  // Enriched by SearchContent before passed to CheckAvailability
  posterUrl?: string;
  overview?: string;
  imdbRating?: number;
  year?: string;
  genre?: string;
  runtime?: string;
}

// ── Request body ───────────────────────────────────────────────────────────
export interface AgentRequestBody {
  message: string;
  history: Message[];
  // Sent by the client after the user completes clarification chips
  clarificationAnswers?: Record<string, string[]>;
  // Detected on client via Intl.DateTimeFormat
  country?: string;
  platforms?: string[];
}
