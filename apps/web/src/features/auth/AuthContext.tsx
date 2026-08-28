import type { Session, User } from '../../api/contracts/entities';
import type { Result } from '../../shared/auth/types';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { mockAuthRepository } from '../../mocks/repositories';

export type AuthUser = Omit<User, 'password'>;

type AuthContextValue = {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<Result<Session>>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadAuthUser(): Promise<{ user: AuthUser | null; session: Session | null }> {
  const [sessionResult, userResult] = await Promise.all([
    mockAuthRepository.getSession(),
    mockAuthRepository.getCurrentUser(),
  ]);

  if (!sessionResult.ok) {
    return { user: null, session: null };
  }

  if (!userResult.ok || !userResult.value) {
    return { user: null, session: null };
  }

  const { password: _password, ...publicUser } = userResult.value;
  return { user: publicUser, session: sessionResult.value };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await loadAuthUser();
    setUser(next.user);
    setSession(next.session);
  }, []);

  useEffect(() => {
    loadAuthUser()
      .then((next) => {
        setUser(next.user);
        setSession(next.session);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await mockAuthRepository.login(username, password);

      if (result.ok) {
        await refresh();
      }

      return result;
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await mockAuthRepository.logout();
    setUser(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ user, session, isLoading, login, logout, refresh }),
    [user, session, isLoading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
