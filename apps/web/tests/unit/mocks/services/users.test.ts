import { describe, expect, it } from 'vitest';

import { createInitialState } from '../../../../src/mocks/data/seed';
import {
  MIN_USER_PASSWORD_LENGTH,
  nextUserId,
  prepareUserSave,
  toManagedUser,
} from '../../../../src/mocks/services/users';

describe('prepareUserSave', () => {
  const seedUsers = createInitialState().users;
  const adminId = 'U-ADMIN';

  it('creates a seller with a generated id and required password', () => {
    expect(nextUserId(seedUsers, 'maria')).toBe('U-MARIA');

    const result = prepareUserSave(
      seedUsers,
      {
        name: '  María López  ',
        username: 'Maria',
        password: 'clave123',
        role: 'SELLER',
        active: true,
        phone: '809-555-0900',
      },
      adminId,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        id: 'U-MARIA',
        name: 'María López',
        username: 'maria',
        password: 'clave123',
        role: 'SELLER',
        active: true,
        phone: '809-555-0900',
      });
      expect(toManagedUser(result.value)).not.toHaveProperty('password');
    }
  });

  it('rejects a missing password on create and a short password', () => {
    expect(
      prepareUserSave(
        seedUsers,
        { name: 'Ana', username: 'ana', role: 'SELLER', active: true },
        adminId,
      ).ok,
    ).toBe(false);

    const short = prepareUserSave(
      seedUsers,
      {
        name: 'Ana',
        username: 'ana',
        password: '12345',
        role: 'SELLER',
        active: true,
      },
      adminId,
    );

    expect(short.ok).toBe(false);
    if (!short.ok) {
      expect(short.error.message).toContain(String(MIN_USER_PASSWORD_LENGTH));
    }
  });

  it('rejects a duplicate username regardless of case', () => {
    const result = prepareUserSave(
      seedUsers,
      {
        name: 'Otro',
        username: 'LAURA',
        password: 'demo1234',
        role: 'SELLER',
        active: true,
      },
      adminId,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });

  it('keeps the current password when editing without a new one', () => {
    const result = prepareUserSave(
      seedUsers,
      {
        id: 'U-LAURA',
        name: 'Laura Pérez',
        username: 'laura',
        role: 'SELLER',
        active: true,
        phone: '809-555-0109',
      },
      adminId,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.password).toBe('demo1234');
      expect(result.value.phone).toBe('809-555-0109');
    }
  });

  it('prevents self-deactivation and leaving the last active administrator', () => {
    const self = prepareUserSave(
      seedUsers,
      {
        id: 'U-ADMIN',
        name: 'Administrador Demo',
        username: 'admin',
        role: 'ADMINISTRATOR',
        active: false,
      },
      adminId,
    );

    expect(self.ok).toBe(false);
    if (!self.ok) {
      expect(self.error.message).toContain('propia cuenta');
    }

    const demote = prepareUserSave(
      seedUsers,
      {
        id: 'U-ADMIN',
        name: 'Administrador Demo',
        username: 'admin',
        role: 'SELLER',
        active: true,
      },
      'U-LAURA',
    );

    expect(demote.ok).toBe(false);
    if (!demote.ok) {
      expect(demote.error.message).toContain('administrador activo');
    }
  });

  it('reactivates Carlos without inventing a password change', () => {
    const result = prepareUserSave(
      seedUsers,
      {
        id: 'U-CARLOS',
        name: 'Carlos Méndez',
        username: 'carlos',
        role: 'MECHANIC',
        active: true,
      },
      adminId,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.active).toBe(true);
      expect(result.value.password).toBe('demo1234');
    }
  });
});
