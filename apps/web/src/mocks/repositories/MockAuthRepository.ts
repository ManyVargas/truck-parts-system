import type { AuthRepository } from '../../api/contracts/repositories';
import { err, ok } from '../../shared/auth/types';
import { clearSession, createSession, getSession, setSession } from '../session';
import { cloneForRead, getMockState } from '../state';

function findUserByUsername(username: string) {
  return getMockState().users.find(
    (entry) => entry.username.toLowerCase() === username.trim().toLowerCase(),
  );
}

/** Mock auth — swap for HttpAuthRepository when VITE_USE_MOCK_API=false (WM12 / API M10). */
export class MockAuthRepository implements AuthRepository {
  async login(username: string, password: string) {
    const user = findUserByUsername(username);

    if (!user) {
      return err({ code: 'UNAUTHORIZED', message: 'Usuario o contraseña incorrectos' });
    }

    if (!user.active) {
      return err({ code: 'FORBIDDEN', message: 'Esta cuenta está desactivada. Contacte al administrador.' });
    }

    if (user.password !== password) {
      return err({ code: 'UNAUTHORIZED', message: 'Usuario o contraseña incorrectos' });
    }

    const session = createSession(user.id);
    setSession(session);
    return ok(cloneForRead(session));
  }

  async logout() {
    clearSession();
    return ok(undefined);
  }

  async getSession() {
    const session = getSession();
    return ok(session ? cloneForRead(session) : null);
  }

  async getCurrentUser() {
    const session = getSession();

    if (!session) {
      return ok(null);
    }

    const user = getMockState().users.find((entry) => entry.id === session.userId);

    if (!user) {
      clearSession();
      return ok(null);
    }

    if (!user.active) {
      clearSession();
      return err({ code: 'FORBIDDEN', message: 'Esta cuenta está desactivada' });
    }

    return ok(cloneForRead(user));
  }
}

export const mockAuthRepository = new MockAuthRepository();
