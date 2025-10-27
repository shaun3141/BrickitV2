import type { Session } from '@supabase/supabase-js';

let currentSession: Session | null = null;

type SessionListener = (session: Session | null) => void;
const listeners = new Set<SessionListener>();

export function setAuthSession(session: Session | null) {
  currentSession = session;
  for (const listener of listeners) {
    try {
      listener(currentSession);
    } catch (err) {
      // ignore listener errors to avoid breaking callers
    }
  }
}

export function getAuthSession(): Session | null {
  return currentSession;
}

export function getAccessToken(): string | null {
  return currentSession?.access_token ?? null;
}

export function subscribeToSession(listener: SessionListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}


