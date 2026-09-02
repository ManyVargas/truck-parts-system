import { Link, useNavigate } from 'react-router-dom';

import type { WorkOrderListRow } from '../../api/contracts/work-orders';
import { WOStatusChip, WOTypeChip } from '../../shared/domain';
import { Empty, Mono } from '../../shared/ui';

export type WorkOrderTableProps = {
  rows: WorkOrderListRow[];
};

export function WorkOrderTable({ rows }: WorkOrderTableProps) {
  const navigate = useNavigate();

  if (rows.length === 0) {
    return (
      <Empty
        title="No hay órdenes en esta vista"
        description="Cambie de filtro o cree una orden de trabajo manual de desarme o instalación."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white">
      <table className="min-w-full text-left text-sm">
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
            <tr
              key={row.id}
              className="cursor-pointer text-navy hover:bg-navy-50/60"
              onClick={() => navigate(row.href)}
            >
              <td className="px-4 py-3">
                <Link
                  to={row.href}
                  className="font-medium text-brand hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Mono>{row.id}</Mono>
                </Link>
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
                  <Link
                    to={`/sales/${row.invoiceId}`}
                    className="text-brand hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Mono>{row.invoiceNumber ?? row.invoiceId}</Mono>
                  </Link>
                ) : (
                  <span className="text-navy-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <WOStatusChip status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
