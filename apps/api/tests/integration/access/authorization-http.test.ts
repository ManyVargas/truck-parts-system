import { randomUUID } from 'node:crypto';

import { Role } from '@prisma/client';
import request from 'supertest';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import {
  ADMIN_AUTHORIZATION_PROBE_PATH,
  INSUFFICIENT_PERMISSIONS_MESSAGE,
} from '../../../src/features/access/constants.js';
import { hashPassword } from '../../../src/features/access/password.js';
import { UserRepository } from '../../../src/features/users/repository.js';
import { disconnectPrisma, prisma } from '../../../src/infrastructure/database/index.js';
import { createTestApp } from '../../helpers/app.js';

const users = new UserRepository();
const PASSWORD = 'correct-password';
const ADMIN_PROBE = `/api/auth${ADMIN_AUTHORIZATION_PROBE_PATH}`;

function assertNoCommercialFields(body: unknown) {
  expect(JSON.stringify(body)).not.toMatch(
    /price|cost|invoice|customer|profit|payment|passwordHash/i,
  );
}

async function createUser(role: Role) {
  const username = `authz-${role.toLowerCase()}-${randomUUID()}`;
  const user = await users.create({
    name: `${role} Fixture`,
    username,
    role,
    mustChangePassword: false,
    passwordHash: await hashPassword(PASSWORD),
    phone: '8095550000',
    email: `${username}@example.com`,
  });
  return { user, username, password: PASSWORD };
}

async function loginAs(role: Role) {
  const fixture = await createUser(role);
  const agent = request.agent(createTestApp());
  const login = await agent.post('/api/auth/login').send({
    username: fixture.username,
    password: fixture.password,
  });
  expect(login.status).toBe(200);
  return { ...fixture, agent };
}

describe('authorization HTTP (integration)', () => {
  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(disconnectPrisma);

  it('rejects a missing session on the admin probe with 401', async () => {
    const response = await request(createTestApp()).get(ADMIN_PROBE);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it.each([Role.SELLER, Role.MECHANIC] as const)(
    'rejects %s on the admin probe with 403 without changing user state',
    async (role) => {
      const { agent, user } = await loginAs(role);
      const before = await users.findById(user.id);

      const response = await agent.get(ADMIN_PROBE);

      expect(response.status).toBe(403);
      expect(response.body.error).toMatchObject({
        code: 'FORBIDDEN',
        message: INSUFFICIENT_PERMISSIONS_MESSAGE,
      });
      expect(await users.findById(user.id)).toEqual(before);
    },
  );

  it('allows Administrator on the admin probe', async () => {
    const { agent } = await loginAs(Role.ADMINISTRATOR);
    const response = await agent.get(ADMIN_PROBE);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('returns a Mechanic session with identity only and still allows own profile contact', async () => {
    const { agent, user, username } = await loginAs(Role.MECHANIC);

    const session = await agent.get('/api/auth/session');
    expect(session.status).toBe(200);
    expect(session.body).toEqual({
      id: user.id,
      username,
      name: user.name,
      role: Role.MECHANIC,
      mustChangePassword: false,
    });
    expect(session.body).not.toHaveProperty('phone');
    expect(session.body).not.toHaveProperty('email');
    assertNoCommercialFields(session.body);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      id: user.id,
      username,
      phone: user.phone,
      email: user.email,
      role: Role.MECHANIC,
      mustChangePassword: false,
      active: true,
    });
    assertNoCommercialFields(me.body);
  });

  it('includes own contact on Seller and Administrator sessions', async () => {
    for (const role of [Role.SELLER, Role.ADMINISTRATOR] as const) {
      const { agent, user, username } = await loginAs(role);
      const session = await agent.get('/api/auth/session');
      expect(session.status).toBe(200);
      expect(session.body).toEqual({
        id: user.id,
        username,
        name: user.name,
        role,
        mustChangePassword: false,
        phone: user.phone,
        email: user.email,
      });
      assertNoCommercialFields(session.body);
    }
  });
});
