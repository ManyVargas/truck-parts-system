import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import type { Role } from '../../src/api/contracts/entities';
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
} from '../../src/features/auth/auth-context';
import { ToastProvider, Toaster } from '../../src/shared/ui';

function authUser(role: Role): AuthUser {
  return {
    id: `U-${role}`,
    name: role,
    username: role.toLowerCase(),
    role,
    active: true,
  };
}

export function createAuthValue(role: Role = 'ADMINISTRATOR'): AuthContextValue {
  const user = authUser(role);
  return {
    user,
    session: { userId: user.id, createdAt: '2026-08-25T16:00:00.000Z' },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options: {
    route?: string;
    auth?: AuthContextValue;
  } = {},
) {
  const auth = options.auth ?? createAuthValue();

  return {
    auth,
    ...render(
      <MemoryRouter initialEntries={[options.route ?? '/']}>
        <AuthContext.Provider value={auth}>
          <ToastProvider>
            {ui}
            <Toaster />
          </ToastProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  };
}
