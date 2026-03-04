// TODO: Phase 7 — Session persistence
// Web: localStorage key 'flixscout_session'
// Native: AsyncStorage key 'flixscout_session'
// Stores full message history, loads on app start

import type { Message } from '../../shared/types';

export type { Message };

export function useSession() {
  return {
    messages: [] as Message[],
    addMessage: (_message: Message) => {},
    clearSession: () => {},
  };
}
