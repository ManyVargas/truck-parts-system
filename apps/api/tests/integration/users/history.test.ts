import { randomUUID } from 'node:crypto';
import type { Role } from '@prisma/client';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { AccessService } from '../../../src/features/access/service.js';
import { hashPassword } from '../../../src/features/access/password.js';
import { HistoryRepository } from '../../../src/features/history/repository.js';
import { bootstrapAdministrator } from '../../../src/features/users/bootstrap.js';
import { UserRepository } from '../../../src/features/users/repository.js';
import { UserService } from '../../../src/features/users/service.js';
import { prisma, disconnectPrisma } from '../../../src/infrastructure/database/index.js';
import { clearTestHistory } from '../../helpers/history.js';

const users = new UserRepository();
const service = new UserService();
const access = new AccessService();
const password = 'personal-secret';
async function fixture(role: Role = 'ADMINISTRATOR') {
  return users.create({
    name: 'Original',
    username: randomUUID(),
    role,
    passwordHash: await hashPassword(password),
  });
}
function events(subjectId: string) {
  return prisma.historyEvent.findMany({
    where: { subjectId },
    orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
  });
}
async function pending(username: string) {
  await service.requestRecovery({ username });
  return prisma.passwordRecoveryRequest.findFirstOrThrow({
    where: { user: { username }, status: 'PENDING' },
  });
}

describe('M9 atomic account history (HIST-001/002, AUTH-004)', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await clearTestHistory();
    await prisma.passwordRecoveryRequest.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });
  afterAll(disconnectPrisma);

  it('records creation and actual role/state/profile transitions, retaining inactive actors', async () => {
    const admin = await fixture();
    const otherAdmin = await fixture();
    const user = await service.create(admin.id, {
      name: 'New',
      username: 'new-user',
      role: 'SELLER',
    });
    await service.update(admin.id, user.id, {
      role: 'MECHANIC',
      active: false,
      name: 'Edited',
      username: 'edited',
      phone: '123',
      email: 'edited@example.com',
    });
    await service.update(admin.id, user.id, { active: false, role: 'MECHANIC', name: 'Edited' });
    await service.update(admin.id, user.id, { active: true, phone: null, email: null });
    const previous = await events(user.id);
    expect(previous.map((e) => e.eventType).sort()).toEqual(
      [
        'USER_CREATED',
        'USER_ROLE_CHANGED',
        'USER_DEACTIVATED',
        'USER_ACTIVATED',
        'USER_PROFILE_CHANGED',
        'USER_PROFILE_CHANGED',
      ].sort(),
    );
    expect(previous.find((e) => e.eventType === 'USER_ROLE_CHANGED')?.payload).toEqual({
      before: 'SELLER',
      after: 'MECHANIC',
    });
    expect(
      previous.filter((e) => e.eventType === 'USER_PROFILE_CHANGED').map((e) => e.payload),
    ).toEqual(
      expect.arrayContaining([
        {
          before: { name: 'New', username: 'new-user', phone: null, email: null },
          after: { name: 'Edited', username: 'edited', phone: '123', email: 'edited@example.com' },
        },
      ]),
    );
    await service.update(otherAdmin.id, admin.id, { active: false });
    expect(await events(user.id)).toEqual(previous);
    const attributed = await prisma.historyEvent.findMany({
      where: { subjectId: user.id },
      include: { actor: true },
    });
    expect(attributed.every((e) => e.actor?.id === admin.id && e.actor.active === false)).toBe(
      true,
    );
    expect(JSON.stringify(previous)).not.toMatch(
      /passwordHash|solocamiones|argon2|personal-secret/,
    );
  });

  it('rejects event updates/deletes and invalid actor references in PostgreSQL', async () => {
    const admin = await fixture();
    const user = await service.create(admin.id, { name: 'New', username: 'new', role: 'SELLER' });
    const event = (await events(user.id))[0]!;
    await expect(
      prisma.historyEvent.update({ where: { id: event.id }, data: { payload: {} } }),
    ).rejects.toThrow('append-only');
    await expect(prisma.historyEvent.delete({ where: { id: event.id } })).rejects.toThrow(
      'append-only',
    );
    await expect(prisma.user.delete({ where: { id: admin.id } })).rejects.toThrow();
    const data = {
      eventType: 'USER_CREATED',
      subjectType: 'USER',
      subjectId: user.id,
      payload: {},
    };
    await expect(
      prisma.historyEvent.create({ data: { ...data, actorType: 'USER', actorUserId: null } }),
    ).rejects.toThrow();
    await expect(
      prisma.historyEvent.create({
        data: { ...data, actorType: 'ANONYMOUS', actorUserId: admin.id },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.historyEvent.create({
        data: { ...data, actorType: 'USER', actorUserId: randomUUID() },
      }),
    ).rejects.toThrow();
    expect(await events(user.id)).toEqual([event]);
  });

  it('does not append success for rejected commands or duplicate usernames', async () => {
    const admin = await fixture();
    const seller = await fixture('SELLER');
    await expect(service.update(seller.id, admin.id, { name: 'Denied' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(service.update(admin.id, admin.id, { active: false })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(
      service.create(admin.id, { name: 'Duplicate', username: seller.username, role: 'SELLER' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await prisma.historyEvent.count()).toBe(0);
  });

  it.each(['create', 'deactivate', 'approve', 'password'] as const)(
    'rolls back every effect when history fails during %s',
    async (operation) => {
      const admin = await fixture();
      const user = await fixture('SELLER');
      await access.login({ username: user.username, password });
      const recovery = await pending(user.username);
      const before = await events(user.id);
      const append = HistoryRepository.prototype.append;
      // Fail after the INSERT too: both earlier events and this event must roll back.
      vi.spyOn(HistoryRepository.prototype, 'append').mockImplementation(async function (
        this: HistoryRepository,
        input,
      ) {
        const inserted = await append.call(this, input);
        if (operation === 'deactivate' && input.eventType === 'USER_DEACTIVATED') return inserted;
        throw new Error('history write failed');
      });
      const operationPromise =
        operation === 'create'
          ? service.create(admin.id, { name: 'New', username: 'rollback', role: 'SELLER' })
          : operation === 'deactivate'
            ? service.update(admin.id, user.id, { active: false })
            : operation === 'approve'
              ? service.resolveRecovery(admin.id, recovery.id, {
                  action: 'approve',
                  identityVerified: true,
                })
              : access.updateOwnProfile(user.id, {
                  name: user.name,
                  currentPassword: password,
                  password: 'replacement-secret',
                });
      await expect(operationPromise).rejects.toThrow('history write failed');
      expect(await users.findById(user.id)).toEqual(user);
      expect(await users.findByUsername('rollback')).toBeNull();
      expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
      expect(
        await prisma.passwordRecoveryRequest.findUnique({ where: { id: recovery.id } }),
      ).toEqual(recovery);
      expect(await events(user.id)).toEqual(before);
    },
  );

  it('attributes anonymous requests honestly and records concurrent approval exactly once without secrets', async () => {
    const admin = await fixture();
    const user = await fixture('SELLER');
    await service.requestRecovery({ username: 'missing' });
    await Promise.all(
      Array.from({ length: 4 }, () => service.requestRecovery({ username: user.username })),
    );
    const recovery = await pending(user.username);
    expect(await events(user.id)).toMatchObject([
      {
        eventType: 'USER_RECOVERY_REQUESTED',
        actorType: 'ANONYMOUS',
        actorUserId: null,
        payload: { requestId: recovery.id },
      },
    ]);
    const resolutions = await Promise.allSettled(
      Array.from({ length: 3 }, () =>
        service.resolveRecovery(admin.id, recovery.id, {
          action: 'approve',
          identityVerified: true,
        }),
      ),
    );
    const succeeded = resolutions.filter((r) => r.status === 'fulfilled');
    expect(succeeded).toHaveLength(1);
    const temporary = succeeded[0]!.value.temporaryPassword!;
    expect(
      (await events(user.id)).filter((e) => e.eventType === 'USER_RECOVERY_APPROVED'),
    ).toMatchObject([{ actorUserId: admin.id, payload: { identityVerified: true } }]);
    const changes = await Promise.allSettled(
      ['replacement-one', 'replacement-two'].map((next) =>
        access.updateOwnProfile(user.id, {
          name: 'Own profile',
          currentPassword: temporary,
          password: next,
        }),
      ),
    );
    expect(changes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rows = await events(user.id);
    expect(rows.filter((e) => e.eventType === 'USER_PASSWORD_CHANGED')).toMatchObject([
      { actorUserId: user.id, payload: { wasChangeRequired: true, mustChangePassword: false } },
    ]);
    expect(rows.filter((e) => e.eventType === 'USER_PROFILE_CHANGED')).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(temporary);
    expect(JSON.stringify(rows)).not.toMatch(
      /passwordHash|argon2|personal-secret|replacement-one|replacement-two/,
    );
  });

  it('records rejection, system expiry and both cancellation reasons only once', async () => {
    const admin = await fixture();
    const user = await fixture('SELLER');
    const first = await pending(user.username);
    await service.resolveRecovery(admin.id, first.id, { action: 'reject' });
    const second = await pending(user.username);
    const future = new UserService(undefined, () => new Date(second.expiresAt));
    await future.listRecoveries(admin.id, {});
    await future.listRecoveries(admin.id, {});
    await pending(user.username);
    await access.updateOwnProfile(user.id, {
      name: user.name,
      currentPassword: password,
      password: 'new-personal',
    });
    await pending(user.username);
    await service.update(admin.id, user.id, { active: false });
    await service.update(admin.id, user.id, { active: false });
    const rows = await events(user.id);
    expect(rows.filter((e) => e.eventType === 'USER_RECOVERY_REJECTED')).toMatchObject([
      { actorUserId: admin.id },
    ]);
    expect(rows.filter((e) => e.eventType === 'USER_RECOVERY_EXPIRED')).toMatchObject([
      { actorType: 'SYSTEM', actorUserId: null },
    ]);
    expect(rows.filter((e) => e.eventType === 'USER_RECOVERY_CANCELLED')).toMatchObject([
      { actorUserId: user.id, payload: { reason: 'PASSWORD_CHANGED' } },
      { actorUserId: admin.id, payload: { reason: 'USER_DEACTIVATED' } },
    ]);
    expect(rows.find((e) => e.eventType === 'USER_PASSWORD_CHANGED')?.payload).toEqual({
      wasChangeRequired: false,
      mustChangePassword: false,
    });
  });

  it('records a single bootstrap creation with explicit CLI origin and no invented human actor', async () => {
    const results = await Promise.allSettled(
      ['first', 'second'].map((username) =>
        bootstrapAdministrator({ name: 'Admin', username, password }),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rows = await prisma.historyEvent.findMany();
    expect(rows).toMatchObject([
      {
        actorType: 'SYSTEM',
        actorUserId: null,
        eventType: 'USER_CREATED',
        payload: { source: 'BOOTSTRAP_CLI' },
      },
    ]);
    expect(await users.findById(rows[0]!.subjectId)).not.toBeNull();
  });
});
