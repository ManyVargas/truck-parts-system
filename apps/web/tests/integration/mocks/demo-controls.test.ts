import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEMO_SCENARIOS, resetDemoData, runDemoScenario } from '../../../src/mocks/demo-controls';
import { getSession, setSession } from '../../../src/mocks/session';
import { getMockState, resetMockState } from '../../../src/mocks/state';

describe('demo controls', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  it('keeps the documented scenario catalog complete and unambiguous', () => {
    expect(DEMO_SCENARIOS).toHaveLength(12);
    expect(new Set(DEMO_SCENARIOS.map((scenario) => scenario.id)).size).toBe(12);
    expect(new Set(DEMO_SCENARIOS.map((scenario) => scenario.slug)).size).toBe(12);
  });

  it('restores seed state and clears the active session', () => {
    getMockState().customers.push({ id: 'C99', name: 'Cliente temporal' });
    setSession({ userId: 'U-ADMIN', createdAt: '2026-08-28T16:00:00.000Z' });

    const result = resetDemoData();

    expect(result.ok).toBe(true);
    expect(getMockState().customers).toHaveLength(3);
    expect(getSession()).toBeNull();
  });

  it('rejects unknown scenarios without resetting current state', () => {
    getMockState().customers.push({ id: 'C99', name: 'Cliente temporal' });

    const result = runDemoScenario(999);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
    expect(getMockState().customers).toHaveLength(4);
  });
});
