import { Link } from 'react-router-dom';

import type { MechanicWorkOrderView } from '../../api/contracts/entities';
import { WOStatusChip, WOTypeChip } from '../../shared/domain';
import { Button, Card, Mono } from '../../shared/ui';

export type MechanicOrderCardProps = {
  order: MechanicWorkOrderView;
  isMutating?: boolean;
  onTake?: (workOrderId: string) => void;
};

function contextLine(order: MechanicWorkOrderView): string {
  if (order.type === 'DISMANTLING') {
    return order.sourceParentId
      ? `Retirar de ${order.sourceParentName ?? order.sourceParentId}`
      : 'Sin origen registrado';
  }

  return order.destinationParentId
    ? `Instalar en ${order.destinationParentName ?? order.destinationParentId}`
    : 'Sin destino registrado';
}

export function MechanicOrderCard({ order, isMutating, onTake }: MechanicOrderCardProps) {
  return (
    <Card className="space-y-3" padding="md">
      <div className="flex items-start justify-between gap-2">
        <Link to={order.href} className="min-w-0">
          <p className="font-semibold text-brand">
            <Mono>{order.id}</Mono>
          </p>
          <p className="mt-1 text-sm text-navy">{order.pieceName}</p>
          <p className="text-xs text-navy-400">
            <Mono>{order.pieceId}</Mono>
          </p>
        </Link>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <WOTypeChip type={order.type} />
          <WOStatusChip status={order.status} />
        </div>
      </div>

      <p className="text-sm text-navy-400">{contextLine(order)}</p>
      {order.effectiveLocation && (
        <p className="text-xs text-navy-400">Ubicación: {order.effectiveLocation}</p>
      )}

      {order.actions.canTake && onTake ? (
        <Button
          size="lg"
          className="min-h-12 w-full"
          disabled={isMutating}
          onClick={() => onTake(order.id)}
        >
          Tomar orden
        </Button>
      ) : (
        <Link
          to={order.href}
          className="block min-h-12 rounded-lg border border-navy-200 py-3 text-center text-sm font-medium text-navy hover:bg-navy-50"
        >
          Ver orden
        </Link>
      )}
    </Card>
  );
}
