import { createContext } from 'react';

import type { Session, User } from '../../api/contracts/entities';
import type { Result } from '../../shared/auth/types';

export type AuthUser = Omit<User, 'password'>;

export type AuthContextValue = {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<Result<Session>>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

/**
 * Lives in its own module so Vite HMR can reload AuthProvider/useAuth
 * without calling createContext() again. A new Context object would make
 * useAuth read a different identity than the mounted Provider.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);
