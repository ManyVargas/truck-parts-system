import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../../src/features/access/constants.js';
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from '../../../src/features/access/session-cookie.js';

describe('session cookie helpers', () => {
  it('reads the sid cookie and ignores neighboring cookies', () => {
    const req = {
      headers: { cookie: `other=1; ${SESSION_COOKIE_NAME}=abc123; extra=2` },
    } as Request;

    expect(readSessionToken(req)).toBe('abc123');
    expect(readSessionToken({ headers: {} } as Request)).toBeUndefined();
  });

  it('sets and clears an HttpOnly lax cookie', () => {
    const cookie = vi.fn();
    const clearCookie = vi.fn();
    const res = { cookie, clearCookie } as unknown as Response;
    const expiresAt = new Date('2026-09-05T00:00:00.000Z');

    setSessionCookie(res, 'raw-token', expiresAt);
    expect(cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      'raw-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: false,
        expires: expiresAt,
      }),
    );

    clearSessionCookie(res);
    expect(clearCookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.objectContaining({ httpOnly: true, path: '/', sameSite: 'lax', secure: false }),
    );
  });
});
