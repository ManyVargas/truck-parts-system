import { Card, Info } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';

export type PlaceholderPageProps = {
  title: string;
  milestone: string;
  description?: string;
};

/** Temporary screen until the corresponding milestone ships real UI. */
export function PlaceholderPage({ title, milestone, description }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader
        title={title}
        description={description ?? `Pantalla planificada en ${milestone}.`}
      />
      <Card>
        <Info tone="info" title="En construcción">
          Esta sección se implementará en <strong>{milestone}</strong>. La navegación y los guards
          de WM2 ya están activos.
        </Info>
      </Card>
    </>
  );
}
