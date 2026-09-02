import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { SalesListTab } from '../../api/contracts/sales';
import { Button, Info } from '../../shared/ui';
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
  const navigate = useNavigate();

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
        description="Consulta de documentos, pagos y cancelación. Abra un borrador para confirmar una venta."
        actions={
          <Button onClick={() => navigate('/sales/draft/new')}>Nuevo borrador</Button>
        }
      />

      <TabBar tabs={TABS} value={tab} onChange={setTab} aria-label="Estado de factura" />

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
