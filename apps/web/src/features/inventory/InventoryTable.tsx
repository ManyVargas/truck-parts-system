import type { InventoryListRow } from '../../api/contracts/inventory';
import { InventoryStatusCluster } from '../../shared/domain';
import { Empty, EntityLink, HoverRow, Mono, TableShell } from '../../shared/ui';

export type InventoryTableProps = {
  rows: InventoryListRow[];
};

export function InventoryTable({ rows }: InventoryTableProps) {
  if (rows.length === 0) {
    return (
      <Empty
        title="Sin resultados"
        description="Pruebe otra búsqueda, cambie la categoría o active “Mostrar vendidos”."
      />
    );
  }

  return (
    <TableShell>
      <thead className="border-b border-navy-100 bg-navy-50 text-navy-400">
        <tr>
          <th className="px-4 py-3 font-medium">Ítem</th>
          <th className="px-4 py-3 font-medium">Categoría</th>
          <th className="px-4 py-3 font-medium">Ubicación</th>
          <th className="px-4 py-3 font-medium">Estado</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-navy-100">
        {rows.map((row) => {
          const href = `/inventory/${row.id}`;

          return (
            <HoverRow key={`${row.kind}-${row.id}`} to={href}>
              <td className="px-4 py-3">
                <EntityLink to={href}>
                  <span className="block">{row.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-navy-400">
                    <Mono>{row.id}</Mono>
                    <span>
                      {row.kind === 'QTY' ? 'Por cantidad' : row.isAssembly ? 'Ensamblaje' : 'Pieza'}
                    </span>
                  </span>
                </EntityLink>
              </td>
              <td className="px-4 py-3 text-navy-400">{row.categoryName}</td>
              <td className="px-4 py-3 text-navy-400">{row.effectiveLocation ?? 'Pendiente'}</td>
              <td className="px-4 py-3">
                <InventoryStatusCluster
                  commercialState={row.commercialState}
                  physicalRelationship={row.physicalRelationship}
                  parentName={row.parentName}
                  isAssembly={row.isAssembly}
                  complete={row.complete}
                  reserved={row.reserved}
                  reservedByDraftId={row.reservedByDraftId}
                  noDesarmar={row.noDesarmar}
                  protectedRootId={row.protectedRootId}
                  compact
                  layout="stack"
                  stockLine={
                    row.kind === 'QTY'
                      ? `${row.qtyAvailable} disponibles / ${row.qtyOnHand} en existencia`
                      : undefined
                  }
                />
              </td>
            </HoverRow>
          );
        })}
      </tbody>
    </TableShell>
  );
}
