import { describe, expect, it } from 'vitest';

import type { User } from '../../../../src/api/contracts/entities';
import { prepareProfileUpdate } from '../../../../src/mocks/services/profile';

const seller: User = {
  id: 'U-LAURA',
  name: 'Laura Pérez',
  username: 'laura',
  password: 'demo1234',
  role: 'SELLER',
  active: true,
  phone: '809-555-0101',
};

describe('prepareProfileUpdate', () => {
  it('rejects an empty name', () => {
    const result = prepareProfileUpdate(seller, { name: '   ' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.message).toBe('El nombre es obligatorio');
    }
  });

  it('rejects a new password shorter than six characters', () => {
    const result = prepareProfileUpdate(seller, {
      name: 'Laura Pérez',
      currentPassword: 'demo1234',
      newPassword: '12345',
      confirmPassword: '12345',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('rejects a password change when the current password is wrong', () => {
    const result = prepareProfileUpdate(seller, {
      name: 'Laura Pérez',
      currentPassword: 'incorrecta',
      newPassword: 'nueva12',
      confirmPassword: 'nueva12',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('La contraseña actual es incorrecta');
    }
  });

  it('rejects an invalid email when one is provided', () => {
    const result = prepareProfileUpdate(seller, {
      name: 'Laura Pérez',
      email: 'no-es-correo',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('El correo no es válido');
    }
  });

  it('updates contact fields without requiring a password change', () => {
    const result = prepareProfileUpdate(seller, {
      name: '  Laura P.  ',
      phone: '809-555-0199',
      email: 'laura@example.com',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        id: 'U-LAURA',
        username: 'laura',
        role: 'SELLER',
        active: true,
        name: 'Laura P.',
        phone: '809-555-0199',
        email: 'laura@example.com',
        password: 'demo1234',
      });
    }
  });

  it('ignores client-supplied username, role, and active', () => {
    const result = prepareProfileUpdate(seller, {
      name: 'Laura Pérez',
      username: 'admin',
      role: 'ADMINISTRATOR',
      active: false,
    } as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.username).toBe('laura');
      expect(result.value.role).toBe('SELLER');
      expect(result.value.active).toBe(true);
    }
  });
});
