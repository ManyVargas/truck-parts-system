import { Navigate, useLocation } from 'react-router-dom';

import { NotFoundPage } from '../../features/placeholder/NotFoundPage';
import { useAuth } from '../../features/auth/AuthContext';

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10 text-navy">
      <div className="w-full max-w-lg">
        <NotFoundPage />
      </div>
    </div>
  );
}
