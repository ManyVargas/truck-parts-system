import { randomBytes, randomUUID } from 'node:crypto';

import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { SessionRepository } from '../../../src/features/access/repository.js';
import type { CreateSessionRecord } from '../../../src/features/access/types.js';
import { UserRepository } from '../../../src/features/users/repository.js';
import { disconnectPrisma, prisma } from '../../../src/infrastructure/database/index.js';

const sessions = new SessionRepository();
const users = new UserRepository();

function createUser() {
  return users.create({
    name: 'Session test',
    username: `session-${randomUUID()}`,
    role: 'SELLER',
    passwordHash: 'session-test-fixture',
  });
}

function sessionData(userId: string): CreateSessionRecord {
  return {
    userId,
    tokenHash: randomBytes(32).toString('hex'),
    expiresAt: new Date('2030-01-01T12:00:00.123Z'),
  };
}

describe('SessionRepository (PostgreSQL)', () => {
  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(disconnectPrisma);

  it('persists the supplied hash, owner and expiration and looks up only the matching hash', async () => {
    const user = await createUser();
    const data = sessionData(user.id);
    const session = await sessions.create(data);

    expect(session).toMatchObject(data);
    expect(session).not.toHaveProperty('token');
    expect(await sessions.findByTokenHash(data.tokenHash)).toEqual(session);
    expect(await sessions.findByTokenHash('missing-hash')).toBeNull();
  });

  it('returns expired records for the service to evaluate without extending their lifetime', async () => {
    const user = await createUser();
    const session = await sessions.create({
      ...sessionData(user.id),
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
    });
    expect(await sessions.findByTokenHash(session.tokenHash)).toEqual(session);
  });

  it('rejects duplicate hashes and sessions for nonexistent users', async () => {
    const user = await createUser();
    const data = sessionData(user.id);
    const session = await sessions.create(data);
    await expect(sessions.create(data)).rejects.toMatchObject({ code: 'P2002' });
    await expect(sessions.create(sessionData(randomUUID()))).rejects.toMatchObject({
      code: 'P2003',
    });
    expect(await sessions.findByTokenHash(data.tokenHash)).toEqual(session);
    expect(await prisma.session.count()).toBe(1);
  });

  it('revokes one session without removing the owner or other sessions and allows repetition', async () => {
    const user = await createUser();
    const first = await sessions.create(sessionData(user.id));
    const second = await sessions.create(sessionData(user.id));

    expect(await sessions.revokeByTokenHash(first.tokenHash)).toBe(1);
    expect(await sessions.revokeByTokenHash(first.tokenHash)).toBe(0);
    expect(await sessions.findByTokenHash(first.tokenHash)).toBeNull();
    expect(await sessions.findByTokenHash(second.tokenHash)).toEqual(second);
    expect(await users.findById(user.id)).toEqual(user);
  });

  it('revokes all sessions of one user, including expired sessions, without affecting another user', async () => {
    const user = await createUser();
    const other = await createUser();
    const first = await sessions.create(sessionData(user.id));
    const expired = await sessions.create({
      ...sessionData(user.id),
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
    });
    const untouched = await sessions.create(sessionData(other.id));

    expect(await sessions.revokeAllByUserId(user.id)).toBe(2);
    expect(await sessions.revokeAllByUserId(user.id)).toBe(0);
    expect(await sessions.revokeAllByUserId(randomUUID())).toBe(0);
    expect(await sessions.findByTokenHash(first.tokenHash)).toBeNull();
    expect(await sessions.findByTokenHash(expired.tokenHash)).toBeNull();
    expect(await sessions.findByTokenHash(untouched.tokenHash)).toEqual(untouched);
    expect(await users.findById(user.id)).toEqual(user);
  });

  it('creates and reads sessions inside the supplied transaction and commits them', async () => {
    const session = await prisma.$transaction(async (transaction) => {
      const transactionalUsers = new UserRepository(transaction);
      const transactionalSessions = new SessionRepository(transaction);
      const user = await transactionalUsers.create({
        name: 'Transaction test',
        username: `transaction-${randomUUID()}`,
        role: 'MECHANIC',
        passwordHash: 'session-test-fixture',
      });
      const created = await transactionalSessions.create(sessionData(user.id));
      expect(await transactionalSessions.findByTokenHash(created.tokenHash)).toEqual(created);
      return created;
    });
    expect(await sessions.findByTokenHash(session.tokenHash)).toEqual(session);
  });

  it('rolls back session creation, both revocation methods and user state together', async () => {
    const user = await createUser();
    const first = await sessions.create(sessionData(user.id));
    const second = await sessions.create(sessionData(user.id));
    const data = sessionData(user.id);
    const failure = new Error('Abort transaction');

    await expect(
      prisma.$transaction(async (transaction) => {
        const transactionalSessions = new SessionRepository(transaction);
        await new UserRepository(transaction).setActive(user.id, false);
        expect(await transactionalSessions.revokeByTokenHash(first.tokenHash)).toBe(1);
        expect(await transactionalSessions.revokeAllByUserId(user.id)).toBe(1);
        await transactionalSessions.create(data);
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(await sessions.findByTokenHash(first.tokenHash)).toEqual(first);
    expect(await sessions.findByTokenHash(second.tokenHash)).toEqual(second);
    expect(await sessions.findByTokenHash(data.tokenHash)).toBeNull();
    expect(await users.findById(user.id)).toEqual(user);
  });
});
