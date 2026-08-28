import type { Session } from '../api/contracts/entities';

const SESSION_STORAGE_KEY = 'solocamiones.mock.session';

function readStoredSession(): Session | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Session;

    if (!parsed?.userId || !parsed?.createdAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(session: Session | null): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  if (!session) {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/** Hydrated on module load so the first render after reload can read the session. */
let currentSession: Session | null = readStoredSession();

export function getSession(): Session | null {
  return currentSession;
}

export function setSession(session: Session | null): void {
  currentSession = session;
  writeStoredSession(session);
}

export function clearSession(): void {
  currentSession = null;
  writeStoredSession(null);
}

export function createSession(userId: string): Session {
  return {
    userId,
    createdAt: new Date().toISOString(),
  };
}
