// TODO: Phase 7 — Session persistence
// Web: localStorage key 'flixscout_session'
// Native: AsyncStorage key 'flixscout_session'
// Stores full message history, loads on app start

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function useSession() {
  return {
    messages: [] as Message[],
    addMessage: (_message: Message) => {},
    clearSession: () => {},
  };
}
