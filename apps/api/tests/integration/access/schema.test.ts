import { randomUUID } from 'node:crypto';

import { Role } from '@prisma/client';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { disconnectPrisma, prisma } from '../../../src/infrastructure/database/index.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function userData(username = `schema-${randomUUID()}`) {
  return {
    name: 'Schema test user',
    username,
    role: Role.ADMINISTRATOR,
    // Schema fixture only; password hashing is implemented in step 3.
    passwordHash: 'schema-test-placeholder',
  };
}

describe('User and Session database constraints', () => {
  afterEach(async () => {
    // The integration harness selects and resets DATABASE_URL_TEST before this suite.
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(disconnectPrisma);

  it.each(Object.values(Role))('persists role %s with UUID and profile defaults', async (role) => {
    const user = await prisma.user.create({ data: { ...userData(), role } });

    expect(user.id).toMatch(uuidPattern);
    expect(user).toMatchObject({ role, active: true, phone: null, email: null });
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('keeps the identity and username reserved after deactivation', async () => {
    const user = await prisma.user.create({ data: userData() });
    await prisma.user.update({ where: { id: user.id }, data: { active: false } });

    expect(await prisma.user.findUnique({ where: { id: user.id } })).toMatchObject({
      id: user.id,
      username: user.username,
      active: false,
    });
    await expect(prisma.user.create({ data: userData(user.username) })).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it.each(['', 'Admin', ' admin', 'admin ', '\tadmin', 'admin\n', '   '])(
    'rejects noncanonical username %j even through SQL',
    async (username) => {
      await expect(prisma.$executeRaw`
        INSERT INTO "User" ("name", "username", "role", "passwordHash", "updatedAt")
        VALUES ('Schema test', ${username}, 'ADMINISTRATOR', 'fixture', CURRENT_TIMESTAMP)
      `).rejects.toMatchObject({ code: 'P2010', meta: { code: '23514' } });
    },
  );

  it('rejects an unsupported role at the database boundary', async () => {
    await expect(prisma.$executeRaw`
      INSERT INTO "User" ("name", "username", "role", "passwordHash", "updatedAt")
      VALUES ('Schema test', 'invalid-role', 'OWNER', 'fixture', CURRENT_TIMESTAMP)
    `).rejects.toMatchObject({ code: 'P2010', meta: { code: '22P02' } });
  });

  it('supports multiple sessions per user, unique token hashes and restricted user deletion', async () => {
    const user = await prisma.user.create({ data: userData() });
    const expiresAt = new Date('2030-01-01T12:00:00.000Z');
    const first = await prisma.session.create({
      data: { userId: user.id, tokenHash: 'a'.repeat(64), expiresAt },
    });
    await prisma.session.create({
      data: { userId: user.id, tokenHash: 'b'.repeat(64), expiresAt },
    });

    expect(first.id).toMatch(uuidPattern);
    expect(first.expiresAt).toEqual(expiresAt);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(2);
    await expect(
      prisma.session.create({ data: { userId: user.id, tokenHash: first.tokenHash, expiresAt } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(prisma.user.delete({ where: { id: user.id } })).rejects.toMatchObject({
      code: 'P2003',
    });
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(2);
  });

  it('rejects a session without an existing user', async () => {
    await expect(
      prisma.session.create({
        data: { userId: randomUUID(), tokenHash: 'c'.repeat(64), expiresAt: new Date() },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});
