import { describe, expect, it } from 'vitest';

import { httpAuthRepository } from '../../../src/api/http/repositories';

describe('HttpAuthRepository', () => {
  it('boots without a session so the login screen can mount', async () => {
    const session = await httpAuthRepository.getSession();
    const user = await httpAuthRepository.getCurrentUser();
    expect(session).toEqual({ ok: true, value: null });
    expect(user).toEqual({ ok: true, value: null });
  });
});
