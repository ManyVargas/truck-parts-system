import { useState } from 'react';

import type { SalesListTab } from '../../api/contracts/sales';
import { Info } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';
import { TabBar } from '../../shared/layout/TabBar';
import { SalesTable } from './SalesTable';
import { useSalesList } from './useSalesList';

const TABS: { id: SalesListTab; label: string }[] = [
  { id: 'ALL', label: 'Todas' },
  { id: 'DRAFT', label: 'Borrador' },
  { id: 'COMPLETED', label: 'Completada' },
  { id: 'CANCELLED', label: 'Cancelada' },
];

export function SalesPage() {
  const [tab, setTab] = useState<SalesListTab>('ALL');
  const { result } = useSalesList(tab);

  if (result.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar ventas">
        {result.error.message}
      </Info>
    );
  }

  return (
    <>
      <PageHeader
        title="Ventas y Facturas"
        description="Consulta de documentos, pagos y cancelación. El editor de borradores se completa en el punto de venta."
      />

      <TabBar tabs={TABS} value={tab} onChange={setTab} />

      {result.status === 'loading' ? (
        <p className="text-sm text-navy-400" aria-live="polite">
          Cargando facturas…
        </p>
      ) : (
        <SalesTable rows={result.rows} />
      )}
    </>
  );
}
