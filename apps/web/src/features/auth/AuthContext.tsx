import type { Session } from '../../api/contracts/entities';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { authRepository } from '../../api/repositories';
import { AuthContext, type AuthUser } from './auth-context';

export type { AuthUser } from './auth-context';

async function loadAuthUser(): Promise<{ user: AuthUser | null; session: Session | null }> {
  const [sessionResult, userResult] = await Promise.all([
    authRepository.getSession(),
    authRepository.getCurrentUser(),
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
      const result = await authRepository.login(username, password);

      if (result.ok) {
        await refresh();
      }

      return result;
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await authRepository.logout();
    setUser(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ user, session, isLoading, login, logout, refresh }),
    [user, session, isLoading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
