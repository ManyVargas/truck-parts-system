// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mockSalesRepository } from '../../../src/mocks/repositories/MockSalesRepository';
import { reloadMockStateFromStorage, resetMockState } from '../../../src/mocks/state';
import { signInAs } from '../../support/session';

describe('mock state persistence', () => {
  beforeEach(() => {
    resetMockState();
    signInAs('SELLER');
  });

  afterEach(() => {
    resetMockState();
  });

  it('keeps a newly created draft after a simulated tab reload', async () => {
    const created = await mockSalesRepository.createDraft();
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    await Promise.resolve();
    reloadMockStateFromStorage();

    const loaded = await mockSalesRepository.getDraft(created.value.draftId);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.id).toBe(created.value.draftId);
      expect(loaded.value.status).toBe('DRAFT');
    }
  });
});
