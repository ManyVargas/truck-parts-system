import type { UserRepository } from '../../api/contracts/repositories';
import type { SaveUserInput } from '../../api/contracts/users';
import { err, ok } from '../../shared/auth/types';
import { requirePermission } from '../services/require-permission';
import { prepareUserSave, sortManagedUsers, toManagedUser } from '../services/users';
import { cloneForRead, getMockState } from '../state';

export class MockUserRepository implements UserRepository {
  async list() {
    const permission = requirePermission('users.manage');
    if (!permission.ok) {
      return permission;
    }

    return ok(
      cloneForRead(sortManagedUsers(getMockState().users.map(toManagedUser))),
    );
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

    return ok(cloneForRead(toManagedUser(user)));
  }

  async save(input: SaveUserInput) {
    const permission = requirePermission('users.manage');
    if (!permission.ok) {
      return permission;
    }

    const state = getMockState();
    const prepared = prepareUserSave(state.users, input, permission.value.id);
    if (!prepared.ok) {
      return prepared;
    }

    const user = prepared.value;
    const index = state.users.findIndex((entry) => entry.id === user.id);
    if (index >= 0) {
      state.users[index] = user;
    } else {
      state.users.push(user);
    }

    return ok(cloneForRead(toManagedUser(user)));
  }
}

export const mockUserRepository = new MockUserRepository();
