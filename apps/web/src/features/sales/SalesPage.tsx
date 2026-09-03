import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { SalesListRow, SalesListTab } from '../../api/contracts/sales';
import { Button, Info, SearchInput } from '../../shared/ui';
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

function matchesSalesQuery(row: SalesListRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }

  return (
    row.number.toLowerCase().includes(normalized) ||
    row.customerName.toLowerCase().includes(normalized) ||
    row.id.toLowerCase().includes(normalized)
  );
}

export function SalesPage() {
  const [tab, setTab] = useState<SalesListTab>('ALL');
  const [query, setQuery] = useState('');
  const { result } = useSalesList(tab);
  const navigate = useNavigate();
  const visibleRows = useMemo(() => {
    if (result.status !== 'ready') {
      return [];
    }
    return result.rows.filter((row) => matchesSalesQuery(row, query));
  }, [query, result]);

  if (result.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar las ventas">
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

      <div className="mb-6 max-w-md">
        <SearchInput
          id="sales-search"
          label="Buscar por número o cliente"
          placeholder="FAC-000098, nombre del cliente…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <TabBar tabs={TABS} value={tab} onChange={setTab} aria-label="Estado de factura" />

      {result.status === 'loading' ? (
        <p className="text-sm text-navy-400" aria-live="polite">
          Cargando facturas…
        </p>
      ) : (
        <SalesTable rows={visibleRows} hasQuery={query.trim().length > 0} />
      )}
    </>
  );
}
