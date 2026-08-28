import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import type { Role } from '../../api/contracts/entities';
import { UnauthorizedPage } from '../../features/auth/UnauthorizedPage';
import { useAuth } from '../../features/auth/AuthContext';

export type ProtectedRouteProps = {
  children: ReactNode;
  roles?: Role[];
};

/**
 * Ensures authentication and optional layout-level roles.
 * Fine-grained route access is handled by RouteAccessGuard inside the shell.
 */
export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-navy">
        <p className="text-sm text-navy-400">Cargando sesión…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <UnauthorizedPage attemptedPath={location.pathname} variant="standalone" />;
  }

  return <>{children}</>;
}
