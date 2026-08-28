import type { AppState } from '../api/contracts/entities';
import { createInitialState } from './data/seed';

let currentState: AppState = createInitialState();

export function getMockState(): AppState {
  return currentState;
}

export function resetMockState(): AppState {
  currentState = createInitialState();
  return currentState;
}

export function replaceMockState(next: AppState): void {
  currentState = next;
}
