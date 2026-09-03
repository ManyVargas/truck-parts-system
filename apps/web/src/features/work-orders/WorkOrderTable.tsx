import type { WorkOrderListRow } from '../../api/contracts/work-orders';
import { UX_TERMS } from '../../shared/copy/glossary';
import { WOStatusChip, WOTypeChip } from '../../shared/domain';
import { Empty, EntityLink, HoverRow, Mono, TableShell } from '../../shared/ui';

export type WorkOrderTableProps = {
  rows: WorkOrderListRow[];
};

export function WorkOrderTable({ rows }: WorkOrderTableProps) {
  if (rows.length === 0) {
    return (
      <Empty
        title="No hay órdenes de trabajo en esta vista"
        description={`Cambie de filtro o cree una orden de trabajo manual de ${UX_TERMS.dismantling.toLowerCase()} o instalación.`}
      />
    );
  }

  return (
    <TableShell>
      <thead className="border-b border-navy-100 bg-navy-50 text-navy-400">
        <tr>
          <th className="px-4 py-3 font-medium">Orden</th>
          <th className="px-4 py-3 font-medium">Tipo</th>
          <th className="px-4 py-3 font-medium">Pieza</th>
          <th className="px-4 py-3 font-medium">Origen / destino</th>
          <th className="px-4 py-3 font-medium">Asignado</th>
          <th className="px-4 py-3 font-medium">Factura</th>
          <th className="px-4 py-3 font-medium">Estado</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-navy-100">
        {rows.map((row) => (
          <HoverRow key={row.id} to={row.href}>
            <td className="px-4 py-3">
              <EntityLink to={row.href}>
                <Mono>{row.id}</Mono>
              </EntityLink>
            </td>
            <td className="px-4 py-3">
              <WOTypeChip type={row.type} />
            </td>
            <td className="px-4 py-3">
              <p>{row.pieceName}</p>
              <p className="text-xs text-navy-400">
                <Mono>{row.pieceId}</Mono>
              </p>
            </td>
            <td className="px-4 py-3 text-navy-400">
              {row.type === 'DISMANTLING'
                ? row.sourceParentId
                  ? `${row.sourceParentName ?? row.sourceParentId}`
                  : '—'
                : row.destinationParentId
                  ? `${row.destinationParentName ?? row.destinationParentId}`
                  : '—'}
            </td>
            <td className="px-4 py-3">{row.assignedMechanicName ?? 'Sin asignar'}</td>
            <td className="px-4 py-3">
              {row.invoiceId ? (
                <EntityLink to={`/sales/${row.invoiceId}`}>
                  <Mono>{row.invoiceNumber ?? row.invoiceId}</Mono>
                </EntityLink>
              ) : (
                <span className="text-navy-400">—</span>
              )}
            </td>
            <td className="px-4 py-3">
              <WOStatusChip status={row.status} />
            </td>
          </HoverRow>
        ))}
      </tbody>
    </TableShell>
  );
}
