import type { AppState } from '../api/contracts/entities';
import { createInitialState } from './data/seed';

let currentState: AppState = createInitialState();

/** Mutable in-memory state — mock repositories only; never expose to features. */
export function getMockState(): AppState {
  return currentState;
}

/** Deep copy for repository read paths — prevents callers from mutating shared state. */
export function cloneForRead<T>(value: T): T {
  return structuredClone(value);
}

export function resetMockState(): AppState {
  currentState = createInitialState();
  return cloneForRead(currentState);
}

export function replaceMockState(next: AppState): void {
  currentState = next;
}
