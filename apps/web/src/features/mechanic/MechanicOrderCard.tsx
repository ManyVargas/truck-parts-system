import { Link } from 'react-router-dom';

import type { MechanicWorkOrderView } from '../../api/contracts/entities';
import { WOStatusChip, WOTypeChip } from '../../shared/domain';
import { Button, Card, Mono } from '../../shared/ui';
import { mechanicCardActionLabel } from './mechanic-copy';

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
  const canTakeHere = Boolean(order.actions.canTake && onTake);
  const actionLabel = mechanicCardActionLabel(order, canTakeHere);

  return (
    <Card className="space-y-3" padding="md">
      <div className="flex items-start justify-between gap-2">
        <Link to={order.href} className="min-h-11 min-w-0">
          <p className="font-semibold text-brand">
            <Mono className="text-base">{order.id}</Mono>
          </p>
          <p className="mt-1 text-base text-navy">{order.pieceName}</p>
          <p className="text-sm text-navy-400">
            <Mono>{order.pieceId}</Mono>
          </p>
        </Link>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <WOTypeChip type={order.type} />
          <WOStatusChip status={order.status} />
        </div>
      </div>

      <p className="text-sm text-navy">{contextLine(order)}</p>
      {order.effectiveLocation && (
        <p className="text-sm text-navy-400">Ubicación: {order.effectiveLocation}</p>
      )}

      {canTakeHere ? (
        <Button
          size="lg"
          className="w-full"
          disabled={isMutating}
          onClick={() => onTake?.(order.id)}
        >
          {isMutating ? 'Tomando…' : actionLabel}
        </Button>
      ) : (
        <Link
          to={order.href}
          className="block min-h-12 rounded-lg border border-navy-200 py-3 text-center text-base font-medium text-navy hover:bg-navy-50"
        >
          {actionLabel}
        </Link>
      )}
    </Card>
  );
}
