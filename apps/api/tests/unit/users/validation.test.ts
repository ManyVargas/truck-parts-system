import { describe, expect, it } from 'vitest';

import { createUserSchema, usernameSchema } from '../../../src/features/users/validation.js';

const validInput = {
  name: '  Ana Pérez  ',
  username: '\t ANA.PEREZ \n',
  role: 'SELLER',
  password: ' AbC12 ',
};

describe('user creation validation', () => {
  it('normalizes identity and contact while preserving the exact password', () => {
    expect(
      createUserSchema.parse({
        ...validInput,
        phone: ' +1 809 001 0023 ',
        email: ' Ana@example.com ',
      }),
    ).toEqual({
      name: 'Ana Pérez',
      username: 'ana.perez',
      role: 'SELLER',
      password: ' AbC12 ',
      phone: '+1 809 001 0023',
      email: 'Ana@example.com',
    });
  });

  it.each(['ADMINISTRATOR', 'SELLER', 'MECHANIC'])('accepts role %s', (role) => {
    expect(createUserSchema.parse({ ...validInput, role }).role).toBe(role);
  });

  it('accepts omitted, null and blank contact without requiring uniqueness', () => {
    expect(createUserSchema.parse(validInput)).not.toHaveProperty('email');
    expect(createUserSchema.parse({ ...validInput, phone: null, email: null })).toMatchObject({
      phone: null,
      email: null,
    });
    expect(createUserSchema.parse({ ...validInput, phone: ' ', email: '\t' })).toMatchObject({
      phone: null,
      email: null,
    });
  });

  it.each([
    { name: ' \t' },
    { name: undefined },
    { username: '' },
    { username: ' \n' },
    { username: 123 },
    { role: 'OWNER' },
    { role: undefined },
    { email: 'invalid-email' },
    { phone: 8091234567 },
    { password: '12345' },
    { password: undefined },
    { active: false },
    { passwordHash: 'injected-hash' },
    { id: 'injected-id' },
  ])('rejects invalid or persistence-owned fields: %j', (override) => {
    expect(createUserSchema.safeParse({ ...validInput, ...override }).success).toBe(false);
  });

  it('normalizes username consistently on repeated parsing', () => {
    const username = usernameSchema.parse(' Admin ');
    expect(username).toBe('admin');
    expect(usernameSchema.parse(username)).toBe(username);
  });
});
