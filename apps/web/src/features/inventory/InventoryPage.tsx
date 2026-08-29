import { Info } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';
import { InventoryFilters } from './InventoryFilters';
import { InventoryTable } from './InventoryTable';
import { useInventoryCatalog } from './useInventoryCatalog';

export function InventoryPage() {
  const { filters, patchFilters, result, categories } = useInventoryCatalog();

  if (result.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar el inventario">
        {result.error.message}
      </Info>
    );
  }

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Piezas individuales y productos por cantidad. Los vendidos se ocultan salvo que active el histórico."
      />

      <InventoryFilters filters={filters} categories={categories} onChange={patchFilters} />

      {result.status === 'loading' ? (
        <p className="text-sm text-navy-400" aria-live="polite">
          Cargando inventario…
        </p>
      ) : (
        <InventoryTable rows={result.rows} />
      )}
    </>
  );
}
