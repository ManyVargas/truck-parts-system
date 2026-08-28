import type { User } from '../../api/contracts/entities';
import type { UserRepository } from '../../api/contracts/repositories';
import { err, ok } from '../../shared/auth/types';
import { cloneForRead, getMockState } from '../state';

export class MockUserRepository implements UserRepository {
  async list() {
    return ok(cloneForRead(getMockState().users));
  }

  async getById(id: string) {
    const user = getMockState().users.find((entry) => entry.id === id);
    if (!user) {
      return err({ code: 'NOT_FOUND', message: 'Usuario no encontrado' });
    }
    return ok(cloneForRead(user));
  }

  async save(user: User) {
    return ok(cloneForRead(user));
  }
}

export const mockUserRepository = new MockUserRepository();
