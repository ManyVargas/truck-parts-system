import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  INVALID_CREDENTIALS_MESSAGE,
  SESSION_TTL_MS,
} from '../../../src/features/access/constants.js';
import { hashPassword } from '../../../src/features/access/password.js';
import { AccessService } from '../../../src/features/access/service.js';
import { hashSessionToken } from '../../../src/features/access/session-token.js';
import type { AuthUserRecord } from '../../../src/features/access/types.js';
import { AppError } from '../../../src/infrastructure/errors/app-error.js';
import type { UserRepository } from '../../../src/features/users/repository.js';
import type { SessionRepository } from '../../../src/features/access/repository.js';
import type { AccountRepositories } from '../../../src/features/users/transaction.js';

const NOW = new Date('2026-09-04T12:00:00.000Z');
const PASSWORD = 'correct-password';

const users = {
  findByUsername: vi.fn(),
  findById: vi.fn(),
  updateOwnProfile: vi.fn(),
};

const sessions = {
  revokeAllByUserId: vi.fn(),
  create: vi.fn(),
  findByTokenHash: vi.fn(),
  revokeByTokenHash: vi.fn(),
};

function createService() {
  return new AccessService(
    users as unknown as UserRepository,
    sessions as unknown as SessionRepository,
    () => NOW,
    async (work) =>
      work({
        users,
        sessions,
        recoveries: { cancelForUser: vi.fn().mockResolvedValue([]) },
        history: { append: vi.fn() },
      } as unknown as AccountRepositories),
  );
}

async function activeUser(overrides: Partial<AuthUserRecord> = {}): Promise<AuthUserRecord> {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'seller',
    name: 'Ana Seller',
    role: Role.SELLER,
    mustChangePassword: false,
    phone: '8095550000',
    email: 'ana@example.com',
    active: true,
    createdAt: NOW,
    updatedAt: NOW,
    passwordHash: await hashPassword(PASSWORD),
    ...overrides,
  };
}

describe('AccessService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    users.findById.mockImplementation(async () => users.findByUsername());
    sessions.create.mockImplementation(async (input) => input);
    sessions.revokeByTokenHash.mockResolvedValue(0);
  });

  describe('login', () => {
    it('creates a rotated session for valid active credentials', async () => {
      const user = await activeUser();
      users.findByUsername.mockResolvedValue(user);

      const result = await createService().login(
        { username: ' Seller ', password: PASSWORD },
        'previous-raw-token',
      );

      expect(result.user).toEqual(user);
      expect(result.expiresAt).toEqual(new Date(NOW.getTime() + SESSION_TTL_MS));
      expect(result.sessionToken).toMatch(/^[0-9a-f]{64}$/);
      expect(sessions.revokeByTokenHash).toHaveBeenCalledWith(
        hashSessionToken('previous-raw-token'),
      );
      expect(sessions.create).toHaveBeenCalledWith({
        tokenHash: hashSessionToken(result.sessionToken),
        userId: user.id,
        expiresAt: result.expiresAt,
      });
    });

    it.each([
      {
        title: 'unknown username',
        user: null,
        password: PASSWORD,
      },
      {
        title: 'wrong password',
        user: 'active',
        password: 'wrong-password',
      },
      {
        title: 'inactive account',
        user: 'inactive',
        password: PASSWORD,
      },
    ])(
      'rejects $title with the same generic message and without a session',
      async ({ user, password }) => {
        if (user === 'active') {
          users.findByUsername.mockResolvedValue(await activeUser());
        } else if (user === 'inactive') {
          users.findByUsername.mockResolvedValue(await activeUser({ active: false }));
        } else {
          users.findByUsername.mockResolvedValue(null);
        }

        await expect(createService().login({ username: 'seller', password })).rejects.toMatchObject(
          {
            code: 'UNAUTHORIZED',
            message: INVALID_CREDENTIALS_MESSAGE,
          },
        );
        expect(sessions.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('logout', () => {
    it('revokes by hash and ignores a missing token', async () => {
      await createService().logout(undefined);
      expect(sessions.revokeByTokenHash).not.toHaveBeenCalled();

      await createService().logout('raw-token');
      expect(sessions.revokeByTokenHash).toHaveBeenCalledWith(hashSessionToken('raw-token'));
    });
  });

  describe('resolveSession', () => {
    it('returns the active owner of an unexpired session', async () => {
      const user = await activeUser();
      sessions.findByTokenHash.mockResolvedValue({
        tokenHash: hashSessionToken('raw-token'),
        userId: user.id,
        expiresAt: new Date(NOW.getTime() + 1000),
      });
      users.findById.mockResolvedValue(user);

      await expect(createService().resolveSession('raw-token')).resolves.toEqual(user);
    });

    it('rejects missing or expired sessions without loading the user', async () => {
      sessions.findByTokenHash.mockResolvedValue(null);
      await expect(createService().resolveSession('missing')).rejects.toBeInstanceOf(AppError);

      sessions.findByTokenHash.mockResolvedValue({
        tokenHash: 'hash',
        userId: 'user-id',
        expiresAt: NOW,
      });
      await expect(createService().resolveSession('expired')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
      expect(users.findById).not.toHaveBeenCalled();
    });

    it('revokes the session when the owner is missing or inactive', async () => {
      const session = {
        tokenHash: hashSessionToken('raw-token'),
        userId: 'user-id',
        expiresAt: new Date(NOW.getTime() + 1000),
      };
      sessions.findByTokenHash.mockResolvedValue(session);
      users.findById.mockResolvedValue(await activeUser({ active: false }));

      await expect(createService().resolveSession('raw-token')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
      expect(sessions.revokeByTokenHash).toHaveBeenCalledWith(session.tokenHash);
    });
  });

  describe('updateOwnProfile', () => {
    it('updates contact fields without a password change', async () => {
      const user = await activeUser();
      const updated = { ...user, name: 'New Name', phone: null };
      users.findById.mockResolvedValue(user);
      users.updateOwnProfile.mockResolvedValue(updated);

      await expect(
        createService().updateOwnProfile(user.id, { name: 'New Name', phone: null }),
      ).resolves.toEqual(updated);
      expect(users.updateOwnProfile).toHaveBeenCalledWith(user.id, {
        name: 'New Name',
        phone: null,
        email: undefined,
        passwordHash: undefined,
      });
    });

    it('rejects a wrong current password with 400 and hashes a valid replacement', async () => {
      const user = await activeUser();
      users.findById.mockResolvedValue(user);

      await expect(
        createService().updateOwnProfile(user.id, {
          name: user.name,
          currentPassword: 'not-the-password',
          password: 'new-password',
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION',
        message: 'Current password is incorrect',
      });
      expect(users.updateOwnProfile).not.toHaveBeenCalled();

      users.updateOwnProfile.mockImplementation(async (_id, input) => ({ ...user, ...input }));
      const result = await createService().updateOwnProfile(user.id, {
        name: user.name,
        currentPassword: PASSWORD,
        password: 'new-password',
      });
      expect(result.passwordHash).toMatch(/^\$argon2id\$/);
      expect(result.passwordHash).not.toBe(user.passwordHash);
    });
  });
});
