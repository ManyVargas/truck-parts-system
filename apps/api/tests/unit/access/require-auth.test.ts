import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../../src/features/access/constants.js';
import { createRequireAuth } from '../../../src/features/access/require-auth.js';
import type { AccessService } from '../../../src/features/access/service.js';
import { AppError } from '../../../src/infrastructure/errors/app-error.js';

describe('requireAuth', () => {
  it('attaches auth without passwordHash when the session resolves', async () => {
    const resolveSession = vi.fn().mockResolvedValue({
      id: 'user-id',
      username: 'seller',
      name: 'Ana',
      role: 'SELLER',
      phone: null,
      email: null,
      active: true,
      createdAt: new Date('2026-09-04T12:00:00.000Z'),
      updatedAt: new Date('2026-09-04T12:00:00.000Z'),
      passwordHash: 'must-not-be-copied',
    });
    const req = {
      headers: { cookie: `${SESSION_COOKIE_NAME}=raw-token` },
    } as Request;
    const next = vi.fn();

    await createRequireAuth({ resolveSession } as unknown as AccessService)(
      req,
      {} as Response,
      next as NextFunction,
    );

    expect(resolveSession).toHaveBeenCalledWith('raw-token');
    expect(req.auth).toMatchObject({ userId: 'user-id', username: 'seller', role: 'SELLER' });
    expect(req.auth).not.toHaveProperty('passwordHash');
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 401 when the cookie is missing', async () => {
    const next = vi.fn();
    await createRequireAuth({ resolveSession: vi.fn() } as unknown as AccessService)(
      { headers: {} } as Request,
      {} as Response,
      next as NextFunction,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0]).toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
