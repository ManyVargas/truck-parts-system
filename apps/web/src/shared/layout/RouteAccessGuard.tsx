import { Outlet, useLocation } from 'react-router-dom';

import { UnauthorizedPage } from '../../features/auth/UnauthorizedPage';
import { useAuth } from '../../features/auth/useAuth';
import { isKnownDesktopRoute, isRouteAllowedForRole } from './navigation';

/**
 * Per-route access check inside an authenticated shell.
 * Renders UnauthorizedPage in the outlet instead of redirecting away.
 */
export function RouteAccessGuard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <p className="text-sm text-navy-400" aria-live="polite">
        Cargando…
      </p>
    );
  }

  if (!user) {
    return null;
  }

  if (!isKnownDesktopRoute(location.pathname)) {
    return <Outlet />;
  }

  if (!isRouteAllowedForRole(location.pathname, user.role)) {
    return <UnauthorizedPage attemptedPath={location.pathname} />;
  }

  return <Outlet />;
}
