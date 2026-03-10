import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Message } from '../../shared/types';

const STORAGE_KEY = 'flixscout_session';

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return Promise.resolve(localStorage.getItem(key));
  return AsyncStorage.getItem(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
  return AsyncStorage.setItem(key, value);
}

async function storageRemove(key: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
  return AsyncStorage.removeItem(key);
}

export function useSession() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    storageGet(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed);
      })
      .catch(() => { /* corrupt storage — start fresh */ });
  }, []);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      const next = [...prev, message];
      storageSet(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearSession = useCallback(() => {
    setMessages([]);
    storageRemove(STORAGE_KEY).catch(() => {});
  }, []);

  return { messages, addMessage, clearSession };
}
