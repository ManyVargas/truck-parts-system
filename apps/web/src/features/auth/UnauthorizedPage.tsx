import { useNavigate } from 'react-router-dom';

import { useAuth } from './AuthContext';
import { defaultPathForRole } from '../../shared/layout/navigation';
import { PageHeader } from '../../shared/layout/PageHeader';
import { Button, Card, Info } from '../../shared/ui';

export type UnauthorizedPageProps = {
  attemptedPath?: string;
  /** Full-screen layout when the user cannot access the shell (e.g. mechanic on desktop). */
  variant?: 'embedded' | 'standalone';
};

export function UnauthorizedPage({ variant = 'embedded' }: UnauthorizedPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const content = (
    <>
      <PageHeader title="Acceso no autorizado" />
      <Card>
        <Info tone="error" title="No tiene permiso para acceder a esta ruta">
          Su rol no tiene acceso a esta sección. Use el menú lateral para navegar a las áreas
          disponibles.
        </Info>
        {user && (
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => navigate(defaultPathForRole(user.role), { replace: true })}
          >
            Volver al inicio
          </Button>
        )}
      </Card>
    </>
  );

  if (variant === 'standalone') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10 text-navy">
        <div className="w-full max-w-lg">{content}</div>
      </div>
    );
  }

  return content;
}
