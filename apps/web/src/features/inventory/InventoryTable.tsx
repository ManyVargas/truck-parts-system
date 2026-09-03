import type { InventoryListRow } from '../../api/contracts/inventory';
import { locationDisplay, UX_TERMS } from '../../shared/copy/glossary';
import {
  CommercialChip,
  CompleteChip,
  NoDesarmarChip,
  RelationChip,
  ReservationChip,
} from '../../shared/domain';
import { Empty, EntityLink, HoverRow, Mono, TableShell } from '../../shared/ui';

export type InventoryTableProps = {
  rows: InventoryListRow[];
};

/** QTY and assemblies get a kind subtitle; a normal piece is the default and needs no extra label. */
function pieceKindSubtitle(row: InventoryListRow): string | null {
  if (row.kind === 'QTY') {
    return UX_TERMS.quantityItem;
  }
  if (row.isAssembly) {
    return UX_TERMS.assembly;
  }
  return null;
}

export function InventoryTable({ rows }: InventoryTableProps) {
  if (rows.length === 0) {
    return (
      <Empty
        title="Sin resultados"
        description="Pruebe otra búsqueda, cambie los filtros o active Vendidos en Más filtros."
      />
    );
  }

  return (
    <TableShell>
      {/* INV-003: availability, physical relation, and restriction alerts stay in separate columns. */}
      <thead className="border-b border-navy-100 bg-navy-50 text-navy-400">
        <tr>
          <th className="px-4 py-3 font-medium">Pieza</th>
          <th className="px-4 py-3 font-medium">Categoría</th>
          <th className="px-4 py-3 font-medium">Ubicación</th>
          <th className="px-4 py-3 font-medium">{UX_TERMS.availability}</th>
          <th className="px-4 py-3 font-medium">{UX_TERMS.relation}</th>
          <th className="px-4 py-3 font-medium">{UX_TERMS.alerts}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-navy-100">
        {rows.map((row) => {
          const href = `/inventory/${row.id}`;
          const kindSubtitle = pieceKindSubtitle(row);
          const locationLabel = locationDisplay(row.effectiveLocation);
          const locationMissing = !row.effectiveLocation?.trim();

          return (
            <HoverRow key={`${row.kind}-${row.id}`} to={href}>
              <td className="px-4 py-3">
                <EntityLink to={href}>
                  <span className="block">{row.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-navy-400">
                    <Mono>{row.id}</Mono>
                    {kindSubtitle ? <span>{kindSubtitle}</span> : null}
                  </span>
                </EntityLink>
              </td>
              <td className="px-4 py-3 text-navy-400">{row.categoryName}</td>
              <td
                className={`px-4 py-3 ${locationMissing ? 'font-medium text-amber-900' : 'text-navy-400'}`}
              >
                {locationLabel}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <CommercialChip state={row.commercialState} />
                  {row.kind === 'QTY' && row.qtyAvailable != null && row.qtyOnHand != null ? (
                    <span className="text-xs text-navy-400">
                      {`${row.qtyAvailable} disponibles / ${row.qtyOnHand} en existencia`}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3">
                <RelationChip relationship={row.physicalRelationship} parentName={row.parentName} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  <ReservationChip reserved={row.reserved} draftId={row.reservedByDraftId} compact />
                  <NoDesarmarChip active={row.noDesarmar} rootId={row.protectedRootId} compact />
                  <CompleteChip complete={row.complete} />
                </div>
              </td>
            </HoverRow>
          );
        })}
      </tbody>
    </TableShell>
  );
}
