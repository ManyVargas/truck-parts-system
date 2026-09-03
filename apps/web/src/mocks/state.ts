import type { AppState } from '../api/contracts/entities';
import { createInitialState } from './data/seed';
import { buildItemCodeSeq } from './services/item-code';
import { clearSession } from './session';

const APP_STATE_STORAGE_KEY = 'solocamiones.mock.app-state.v2';

let persistGeneration = 0;
let currentState: AppState = readStoredState() ?? createInitialState();

function canUseSessionStorage(): boolean {
  try {
    return typeof sessionStorage !== 'undefined';
  } catch {
    return false;
  }
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as AppState;
  return (
    Array.isArray(candidate.invoices) &&
    Array.isArray(candidate.items) &&
    Array.isArray(candidate.users) &&
    Array.isArray(candidate.customers)
  );
}

function hydrateAppState(state: AppState): AppState {
  const seedPrefixes = Object.fromEntries(
    createInitialState().categories.map((category) => [category.id, category.codePrefix]),
  );
  const categories = state.categories.map((category) => ({
    ...category,
    codePrefix: category.codePrefix || seedPrefixes[category.id] || category.codePrefix,
  }));
  return {
    ...state,
    categories,
    itemCodeSeq:
      state.itemCodeSeq && Object.keys(state.itemCodeSeq).length > 0
        ? state.itemCodeSeq
        : buildItemCodeSeq(
            categories.filter((category) => category.codePrefix),
            state.items.map((item) => item.id),
          ),
  };
}

function readStoredState(): AppState | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(APP_STATE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    return isAppState(parsed) ? hydrateAppState(parsed) : null;
  } catch {
    return null;
  }
}

function writeStoredState(state: AppState): void {
  if (!canUseSessionStorage()) {
    return;
  }

  sessionStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));
}

function clearStoredState(): void {
  if (!canUseSessionStorage()) {
    return;
  }

  sessionStorage.removeItem(APP_STATE_STORAGE_KEY);
}

function schedulePersist(): void {
  const generation = persistGeneration;
  queueMicrotask(() => {
    if (generation !== persistGeneration) {
      return;
    }
    writeStoredState(currentState);
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    writeStoredState(currentState);
  });
}

/** Mutable mock store. Writes are kept in sessionStorage so a tab reload keeps drafts. */
export function getMockState(): AppState {
  schedulePersist();
  return currentState;
}

/** Deep copy for repository read paths — prevents callers from mutating shared state. */
export function cloneForRead<T>(value: T): T {
  return structuredClone(value);
}

export function resetMockState(): AppState {
  persistGeneration += 1;
  clearSession();
  clearStoredState();
  currentState = createInitialState();
  return cloneForRead(currentState);
}

export function replaceMockState(next: AppState): void {
  persistGeneration += 1;
  currentState = next;
  writeStoredState(currentState);
}

/** Re-reads sessionStorage as a full page reload would for the in-memory mock. */
export function reloadMockStateFromStorage(): void {
  writeStoredState(currentState);
  persistGeneration += 1;
  currentState = readStoredState() ?? createInitialState();
}
