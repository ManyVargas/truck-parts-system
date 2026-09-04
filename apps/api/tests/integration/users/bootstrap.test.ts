import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { bootstrapAdministrator } from '../../../src/features/users/bootstrap.js';
import { verifyPassword } from '../../../src/features/access/password.js';
import { disconnectPrisma, prisma } from '../../../src/infrastructure/database/index.js';

const input = { name: ' Ana ', username: ' ADMIN ', password: ' AbC12 ', email: '', phone: '' };

describe('initial administrator bootstrap (PostgreSQL)', () => {
  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });
  afterAll(disconnectPrisma);

  it('creates one active administrator with normalized input and a verifiable hash, without a session', async () => {
    const result = await bootstrapAdministrator(input);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: result.id } });
    expect(result).toEqual({ id: user.id, username: 'admin' });
    expect(user).toMatchObject({
      name: 'Ana',
      username: 'admin',
      active: true,
      role: 'ADMINISTRATOR',
      email: null,
      phone: null,
    });
    expect(await verifyPassword(user.passwordHash, input.password)).toBe(true);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.session.count()).toBe(0);
  });

  it.each([true, false])(
    'rejects any existing user (active=%s) without changing it',
    async (active) => {
      const existing = await prisma.user.create({
        data: {
          name: 'Existing',
          username: 'seller',
          role: 'SELLER',
          active,
          passwordHash: 'fixture',
        },
      });
      await expect(bootstrapAdministrator(input)).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(await prisma.user.findMany()).toEqual([existing]);
    },
  );

  it.each([
    { password: '12345' },
    { role: 'SELLER' },
    { active: false },
    { username: ' ' },
    { email: 'invalid' },
  ])('rejects invalid input without creating users', async (override) => {
    await expect(bootstrapAdministrator({ ...input, ...override })).rejects.toMatchObject({
      name: 'ZodError',
    });
    expect(await prisma.user.count()).toBe(0);
  });

  it('allows exactly one of two concurrent bootstraps with different usernames', async () => {
    const results = await Promise.allSettled([
      bootstrapAdministrator({ ...input, username: 'first' }),
      bootstrapAdministrator({ ...input, username: 'second' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({ status: 'rejected', reason: { code: 'CONFLICT' } });
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.session.count()).toBe(0);
  });
});
