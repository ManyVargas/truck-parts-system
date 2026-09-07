import { createContext } from 'react';

import type { AuthSession, PublicUser } from '../../api/contracts/auth';
import type { Result } from '../../shared/auth/types';

export type AuthUser = PublicUser;

export type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<Result<AuthSession>>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearSession: () => void;
};

/**
 * Lives in its own module so Vite HMR can reload AuthProvider/useAuth
 * without calling createContext() again. A new Context object would make
 * useAuth read a different identity than the mounted Provider.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);
