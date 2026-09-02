import { Navigate, useLocation } from 'react-router-dom';

import { StandaloneNotFoundPage } from '../../features/placeholder/NotFoundPage';
import { useAuth } from '../../features/auth/useAuth';

/** Unknown paths: login if guest, 404 if authenticated. */
export function CatchAllRoute() {
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
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <StandaloneNotFoundPage />;
}
