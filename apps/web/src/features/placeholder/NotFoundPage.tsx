import { Card, Info } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';

export function NotFoundPage() {
  return (
    <>
      <PageHeader
        title="Página no encontrada"
        description="La ruta solicitada no existe en el sistema."
      />
      <Card>
        <Info tone="warning" title="404">
          Verifique la URL o use el menú lateral para navegar.
        </Info>
      </Card>
    </>
  );
}
