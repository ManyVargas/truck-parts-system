import { describe, expect, it } from 'vitest';

import {
  toPublicAuthUser,
  toPublicProfile,
  toSessionProjection,
} from '../../../src/features/access/projection.js';
import type { AuthUserRecord } from '../../../src/features/access/types.js';

function sampleUser(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'seller',
    name: 'Ana Seller',
    role: 'SELLER',
    phone: '8095550000',
    email: 'ana@example.com',
    active: true,
    createdAt: new Date('2026-09-04T12:00:00.000Z'),
    updatedAt: new Date('2026-09-04T13:00:00.000Z'),
    passwordHash: '$argon2id$secret-hash',
    ...overrides,
  };
}

describe('auth HTTP projections', () => {
  it('exposes session identity without passwordHash or contact fields', () => {
    const projected = toPublicAuthUser(sampleUser());

    expect(projected).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      username: 'seller',
      name: 'Ana Seller',
      role: 'SELLER',
    });
    expect(JSON.stringify(projected)).not.toContain('passwordHash');
    expect(JSON.stringify(projected)).not.toContain('$argon2id$');
  });

  it('exposes own profile without passwordHash and serializes timestamps as ISO strings', () => {
    const projected = toPublicProfile(sampleUser({ phone: null, email: null, active: false }));

    expect(projected).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      username: 'seller',
      name: 'Ana Seller',
      role: 'SELLER',
      phone: null,
      email: null,
      active: false,
      createdAt: '2026-09-04T12:00:00.000Z',
      updatedAt: '2026-09-04T13:00:00.000Z',
    });
    expect(JSON.stringify(projected)).not.toContain('passwordHash');
    expect(JSON.stringify(projected)).not.toContain('$argon2id$');
  });

  it('keeps Mechanic session identity-only even when contact fields exist', () => {
    const projected = toSessionProjection(sampleUser({ role: 'MECHANIC' }));

    expect(projected).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      username: 'seller',
      name: 'Ana Seller',
      role: 'MECHANIC',
    });
    expect(projected).not.toHaveProperty('phone');
    expect(projected).not.toHaveProperty('email');
    expect(JSON.stringify(projected)).not.toMatch(/price|cost|invoice|customer|profit|payment/i);
  });

  it.each(['SELLER', 'ADMINISTRATOR'] as const)(
    'includes own contact on %s session and still omits commercial fields',
    (role) => {
      const projected = toSessionProjection(sampleUser({ role }));

      expect(projected).toEqual({
        id: '11111111-1111-4111-8111-111111111111',
        username: 'seller',
        name: 'Ana Seller',
        role,
        phone: '8095550000',
        email: 'ana@example.com',
      });
      expect(JSON.stringify(projected)).not.toMatch(/price|cost|invoice|customer|profit|payment/i);
      expect(JSON.stringify(projected)).not.toContain('passwordHash');
    },
  );
});
