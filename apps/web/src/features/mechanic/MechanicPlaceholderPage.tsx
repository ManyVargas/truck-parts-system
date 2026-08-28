import { Card, Info } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';

export type MechanicPlaceholderPageProps = {
  title: string;
};

export function MechanicPlaceholderPage({ title }: MechanicPlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description="Experiencia móvil completa en WM10." />
      <Card>
        <Info tone="info" title="App Mecánico">
          Cola de órdenes, evidencia y completar desarme se implementan en WM10. El login y el shell
          móvil ya están disponibles.
        </Info>
      </Card>
    </>
  );
}
