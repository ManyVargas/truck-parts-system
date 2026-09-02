import { Card, Info } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';
import { ReturnHomeButton } from '../../shared/layout/ReturnHomeButton';

export function NotFoundPage() {
  return (
    <>
      <PageHeader
        title="Página no encontrada"
        description="La ruta solicitada no existe en el sistema."
      />
      <Card>
        <Info tone="warning" title="404">
          Verifique la URL o vuelva al inicio para continuar.
        </Info>
        <ReturnHomeButton />
      </Card>
    </>
  );
}

/** Full-screen 404 when the user is outside the matching shell (e.g. mechanic typo). */
export function StandaloneNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10 text-navy">
      <div className="w-full max-w-lg">
        <NotFoundPage />
      </div>
    </div>
  );
}
