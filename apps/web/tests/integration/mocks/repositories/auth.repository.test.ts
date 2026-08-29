import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mockAuthRepository } from '../../../../src/mocks/repositories/MockAuthRepository';
import { getSession, setSession } from '../../../../src/mocks/session';
import { resetMockState } from '../../../../src/mocks/state';

describe('MockAuthRepository', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  it('normalizes the username and creates a session for valid credentials', async () => {
    const result = await mockAuthRepository.login('  ADMIN  ', 'demo1234');

    expect(result.ok).toBe(true);
    expect(getSession()?.userId).toBe('U-ADMIN');
    const currentUser = await mockAuthRepository.getCurrentUser();
    expect(currentUser.ok && currentUser.value?.role).toBe('ADMINISTRATOR');
  });

  it('rejects invalid credentials without creating a session', async () => {
    const result = await mockAuthRepository.login('admin', 'incorrecta');

    expect(result.ok).toBe(false);
    expect(getSession()).toBeNull();
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('rejects an inactive account', async () => {
    const result = await mockAuthRepository.login('carlos', 'demo1234');

    expect(result.ok).toBe(false);
    expect(getSession()).toBeNull();
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('clears an invalid session while resolving the current user', async () => {
    setSession({ userId: 'U-NOT-FOUND', createdAt: '2026-08-25T16:00:00.000Z' });

    const result = await mockAuthRepository.getCurrentUser();

    expect(result).toEqual({ ok: true, value: null });
    expect(getSession()).toBeNull();
  });

  it('clears the session on logout', async () => {
    await mockAuthRepository.login('laura', 'demo1234');

    await mockAuthRepository.logout();

    expect(getSession()).toBeNull();
  });
});
