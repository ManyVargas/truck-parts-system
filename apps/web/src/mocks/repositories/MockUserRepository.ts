import type { User } from '../../api/contracts/entities';
import type { UserRepository } from '../../api/contracts/repositories';
import { ok } from '../../shared/auth/types';
import { getMockState } from '../state';

export class MockUserRepository implements UserRepository {
  async list() {
    return ok(getMockState().users);
  }

  async getById(id: string) {
    const user = getMockState().users.find((entry) => entry.id === id);
    if (!user) {
      return { ok: false as const, error: { code: 'NOT_FOUND' as const, message: 'Usuario no encontrado' } };
    }
    return ok(user);
  }

  async save(user: User) {
    return ok(user);
  }
}

export const mockUserRepository = new MockUserRepository();
