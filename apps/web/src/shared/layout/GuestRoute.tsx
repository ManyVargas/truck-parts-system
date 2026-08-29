import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { defaultPathForRole } from './navigation';

export type GuestRouteProps = {
  children: ReactNode;
};

function resolveReturnPath(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('from' in state)) {
    return null;
  }

  const { from } = state as { from?: { pathname?: string } | string };

  if (typeof from === 'string') {
    return from;
  }

  if (from?.pathname && from.pathname !== '/login') {
    return from.pathname;
  }

  return null;
}

/** Redirects authenticated users away from the login screen. */
export function GuestRoute({ children }: GuestRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-shell text-white">
        <p className="text-sm text-white/70">Cargando…</p>
      </div>
    );
  }

  if (user) {
    const returnPath = resolveReturnPath(location.state) ?? defaultPathForRole(user.role);
    return <Navigate to={returnPath} replace />;
  }

  return <>{children}</>;
}
