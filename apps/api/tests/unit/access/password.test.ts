import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '../../../src/features/access/password.js';
import { passwordSchema } from '../../../src/features/access/validation.js';

describe('password policy', () => {
  it.each(['123456', 'abcdef', '      ', '🔑🔑🔑🔑🔑🔑', ' AbC12 '])(
    'accepts six or more characters without complexity rules or transformations',
    (password) => {
      expect(passwordSchema.parse(password)).toBe(password);
    },
  );

  it.each(['', '12345', '🔑🔑🔑', null, 123456])('rejects short or nonstring input', (password) => {
    expect(passwordSchema.safeParse(password).success).toBe(false);
  });
});

describe('Argon2id password hashing', () => {
  it('uses the configured costs and independent salts for identical passwords', async () => {
    const password = ' AbC12 ';
    const first = await hashPassword(password);
    const second = await hashPassword(password);

    expect(first).toMatch(/^\$argon2id\$v=19\$/);
    expect(first.split('$')[3].split(',').sort()).toEqual(['m=19456', 'p=1', 't=2']);
    expect(first).not.toBe(second);
    expect(first.split('$')[4]).not.toBe(second.split('$')[4]);
    expect(await verifyPassword(first, password)).toBe(true);
    expect(await verifyPassword(second, password)).toBe(true);
    expect(await verifyPassword(first, password.trim())).toBe(false);
    expect(await verifyPassword(first, password.toLowerCase())).toBe(false);
    expect(await verifyPassword(first, 'incorrect')).toBe(false);
    expect(await verifyPassword(first, '')).toBe(false);
  });

  it('rejects a short password before hashing', async () => {
    await expect(hashPassword('12345')).rejects.toMatchObject({ name: 'ZodError' });
  });

  it('reports a malformed stored hash as a safe internal error', async () => {
    await expect(verifyPassword('bad-secret-hash', 'private-password')).rejects.toMatchObject({
      code: 'INTERNAL',
      message: 'Password verification failed',
    });
  });
});
