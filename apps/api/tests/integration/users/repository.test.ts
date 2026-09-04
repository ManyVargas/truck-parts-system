import { randomUUID } from 'node:crypto';

import { Prisma, Role } from '@prisma/client';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { UserRepository } from '../../../src/features/users/repository.js';
import type { CreateUserRecord } from '../../../src/features/users/types.js';
import { disconnectPrisma, prisma } from '../../../src/infrastructure/database/index.js';

const repository = new UserRepository();

function userData(): CreateUserRecord {
  return {
    name: 'Repository test',
    username: `repository-${randomUUID()}`,
    role: Role.SELLER,
    // Fixture only: password hashing has its own tests.
    passwordHash: 'repository-test-hash',
    phone: '+1 809 001 0023',
    email: 'repository@example.com',
  };
}

describe('UserRepository (PostgreSQL)', () => {
  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(disconnectPrisma);

  it('creates and retrieves a user with the supplied hash and contact', async () => {
    const data = userData();
    const user = await repository.create(data);

    expect(user).toMatchObject({ ...data, active: true });
    expect(user).not.toHaveProperty('password');
    expect(await repository.findById(user.id)).toEqual(user);
    expect(await repository.findByUsername(data.username)).toEqual(user);
  });

  it('returns null for missing users and false for an empty database', async () => {
    expect(await repository.hasAnyUsers()).toBe(false);
    expect(await repository.findById(randomUUID())).toBeNull();
    expect(await repository.findByUsername('missing-user')).toBeNull();
  });

  it('preserves identity and credentials through deactivation and reactivation', async () => {
    const user = await repository.create(userData());
    const deactivated = await repository.setActive(user.id, false);

    expect(deactivated).toMatchObject({
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
      active: false,
    });
    expect(await repository.hasAnyUsers()).toBe(true);
    expect(await repository.findById(user.id)).toEqual(deactivated);
    expect(await repository.findByUsername(user.username)).toEqual(deactivated);
    expect(await prisma.user.count()).toBe(1);
    expect(await repository.setActive(user.id, true)).toMatchObject({ id: user.id, active: true });
  });

  it('preserves the unique-constraint error without overwriting the existing user', async () => {
    const data = userData();
    const user = await repository.create(data);
    await expect(repository.create({ ...data, name: 'Duplicate' })).rejects.toMatchObject({
      code: 'P2002',
    });
    expect(await repository.findById(user.id)).toEqual(user);
    expect(await prisma.user.count()).toBe(1);
  });

  it('does not create a user when updating an unknown identity', async () => {
    await expect(repository.setActive(randomUUID(), false)).rejects.toMatchObject({
      code: 'P2025',
    });
    expect(await repository.hasAnyUsers()).toBe(false);
  });

  it('uses the supplied transaction for reads and writes and commits them together', async () => {
    const data = userData();
    const user = await prisma.$transaction(
      async (transaction) => {
        const transactionalRepository = new UserRepository(transaction);
        expect(await transactionalRepository.hasAnyUsers()).toBe(false);
        const created = await transactionalRepository.create(data);
        expect(await transactionalRepository.hasAnyUsers()).toBe(true);
        expect(await transactionalRepository.findById(created.id)).toEqual(created);
        expect(await transactionalRepository.findByUsername(data.username)).toEqual(created);
        return transactionalRepository.setActive(created.id, false);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    expect(await repository.findById(user.id)).toEqual(user);
    expect(user.active).toBe(false);
  });

  it('updates own contact and optional hash without changing username, role or active', async () => {
    const user = await repository.create(userData());
    const updated = await repository.updateOwnProfile(user.id, {
      name: 'Updated name',
      phone: null,
      email: 'updated@example.com',
      passwordHash: 'rotated-hash',
    });

    expect(updated).toMatchObject({
      id: user.id,
      username: user.username,
      role: user.role,
      active: user.active,
      name: 'Updated name',
      phone: null,
      email: 'updated@example.com',
      passwordHash: 'rotated-hash',
    });
    expect(await repository.findById(user.id)).toEqual(updated);
  });

  it('leaves omitted contact and hash unchanged', async () => {
    const user = await repository.create(userData());
    const updated = await repository.updateOwnProfile(user.id, { name: 'Name only' });

    expect(updated).toMatchObject({
      name: 'Name only',
      phone: user.phone,
      email: user.email,
      passwordHash: user.passwordHash,
      username: user.username,
      role: user.role,
      active: user.active,
    });
  });

  it('rolls back creation and state changes when the caller aborts the transaction', async () => {
    const existing = await repository.create(userData());
    const data = userData();
    const failure = new Error('Abort test transaction');

    await expect(
      prisma.$transaction(async (transaction) => {
        const transactionalRepository = new UserRepository(transaction);
        await transactionalRepository.create(data);
        await transactionalRepository.setActive(existing.id, false);
        await transactionalRepository.updateOwnProfile(existing.id, { name: 'Rolled back' });
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(await repository.findByUsername(data.username)).toBeNull();
    expect(await repository.findById(existing.id)).toEqual(existing);
    expect(await prisma.user.count()).toBe(1);
  });
});
