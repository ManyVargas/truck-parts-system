import type { User } from '../../api/contracts/entities';
import type { UserRepository } from '../../api/contracts/repositories';
import { err, ok } from '../../shared/auth/types';
import { requirePermission } from '../services/require-permission';
import { cloneForRead, getMockState } from '../state';

export class MockUserRepository implements UserRepository {
  async list() {
    const permission = requirePermission('users.manage');
    if (!permission.ok) {
      return permission;
    }

    return ok(cloneForRead(getMockState().users));
  }

  async getById(id: string) {
    const permission = requirePermission('users.manage');
    if (!permission.ok) {
      return permission;
    }

    const user = getMockState().users.find((entry) => entry.id === id);
    if (!user) {
      return err({ code: 'NOT_FOUND', message: 'Usuario no encontrado' });
    }

    return ok(cloneForRead(user));
  }

  async save(user: User) {
    const permission = requirePermission('users.manage');
    if (!permission.ok) {
      return permission;
    }

    const state = getMockState();
    const index = state.users.findIndex((entry) => entry.id === user.id);
    const usernameTaken = state.users.some(
      (entry) => entry.username === user.username && entry.id !== user.id,
    );

    if (usernameTaken) {
      return err({ code: 'CONFLICT', message: 'El nombre de usuario ya existe' });
    }

    if (index >= 0) {
      state.users[index] = { ...user };
    } else {
      state.users.push({ ...user });
    }

    return ok(cloneForRead(user));
  }
}

export const mockUserRepository = new MockUserRepository();
