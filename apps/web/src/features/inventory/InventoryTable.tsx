import { Link, useNavigate } from 'react-router-dom';

import type { InventoryListRow } from '../../api/contracts/inventory';
import {
  AssemblyKindChip,
  CommercialChip,
  CompleteChip,
  NoDesarmarChip,
  RelationChip,
  ReservationChip,
} from '../../shared/domain';
import { Empty, Mono } from '../../shared/ui';

export type InventoryTableProps = {
  rows: InventoryListRow[];
};

export function InventoryTable({ rows }: InventoryTableProps) {
  const navigate = useNavigate();

  if (rows.length === 0) {
    return (
      <Empty
        title="Sin resultados"
        description="Pruebe otra búsqueda, cambie la categoría o active “Mostrar vendidos”."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-navy-100 bg-navy-50 text-navy-400">
          <tr>
            <th className="px-4 py-3 font-medium">Ítem</th>
            <th className="px-4 py-3 font-medium">Categoría</th>
            <th className="px-4 py-3 font-medium">Ubicación</th>
            <th className="px-4 py-3 font-medium">Estados</th>
            <th className="px-4 py-3 font-medium">Stock</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100">
          {rows.map((row) => {
            const href = `/inventory/${row.id}`;

            return (
              <tr
                key={`${row.kind}-${row.id}`}
                className="cursor-pointer text-navy hover:bg-navy-50/60"
                onClick={() => navigate(href)}
              >
                <td className="px-4 py-3">
                  <Link
                    to={href}
                    className="font-medium text-brand hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {row.name}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <Mono className="text-xs text-navy-400">{row.id}</Mono>
                    {row.kind === 'QTY' ? (
                      <span className="text-xs text-navy-400">Por cantidad</span>
                    ) : (
                      <AssemblyKindChip isAssembly={row.isAssembly} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-navy-400">{row.categoryName}</td>
                <td className="px-4 py-3 text-navy-400">{row.effectiveLocation ?? 'Pendiente'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <CommercialChip state={row.commercialState} />
                    <RelationChip
                      relationship={row.physicalRelationship}
                      parentName={row.parentName}
                    />
                    <CompleteChip complete={row.complete} />
                    <ReservationChip reserved={row.reserved} draftId={row.reservedByDraftId} />
                    <NoDesarmarChip active={row.noDesarmar} rootId={row.protectedRootId} />
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-navy-400">
                  {row.kind === 'QTY'
                    ? `${row.qtyAvailable} disponibles / ${row.qtyOnHand} en existencia`
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
