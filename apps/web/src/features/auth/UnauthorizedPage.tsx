import { PageHeader } from '../../shared/layout/PageHeader';
import { ReturnHomeButton } from '../../shared/layout/ReturnHomeButton';
import { Card, Info } from '../../shared/ui';

export type UnauthorizedPageProps = {
  attemptedPath?: string;
  /** Full-screen layout when the user cannot access the shell (e.g. mechanic on desktop). */
  variant?: 'embedded' | 'standalone';
};

export function UnauthorizedPage({ variant = 'embedded' }: UnauthorizedPageProps) {
  const content = (
    <>
      <PageHeader title="Acceso no autorizado" />
      <Card>
        <Info tone="error" title="No tiene permiso para acceder a esta ruta">
          Su rol no tiene acceso a esta sección. Vuelva al inicio para continuar en las áreas
          disponibles.
        </Info>
        <ReturnHomeButton />
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
