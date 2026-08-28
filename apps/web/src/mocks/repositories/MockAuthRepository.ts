import type { AuthRepository } from '../../api/contracts/repositories';
import { err, ok } from '../../shared/auth/types';

/** Skeleton — login/logout wired in WM2. */
export class MockAuthRepository implements AuthRepository {
  async login() {
    return err({ code: 'INTERNAL', message: 'Auth no implementado (WM2)' });
  }

  async logout() {
    return ok(undefined);
  }

  async getSession() {
    return ok(null);
  }

  async getCurrentUser() {
    return ok(null);
  }
}

export const mockAuthRepository = new MockAuthRepository();
