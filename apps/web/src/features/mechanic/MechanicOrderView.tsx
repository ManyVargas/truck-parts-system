import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { WOStatusChip, WOTypeChip } from '../../shared/domain';
import { Button, Card, Field, Info, Input, Mono, useToast } from '../../shared/ui';
import { EvidencePanel } from './EvidencePanel';
import {
  completeActionLabel,
  mechanicNextAction,
  toMechanicUserMessage,
} from './mechanic-copy';
import { useMechanicOrder } from './useMechanicOrders';

function contextLine(type: 'DISMANTLING' | 'INSTALLATION', source?: string, destination?: string) {
  if (type === 'DISMANTLING') {
    return source ? `Retirar de ${source}` : 'Sin origen registrado';
  }
  return destination ? `Instalar en ${destination}` : 'Sin destino registrado';
}

export function MechanicOrderView() {
  const { id } = useParams();
  const { result, isMutating, isCompleting, addPhoto, complete, reload } = useMechanicOrder(id);
  const { pushToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState('');

  if (result.status === 'error') {
    return (
      <div className="space-y-3">
        <Info tone="error" title="No se pudo cargar la orden">
          {toMechanicUserMessage(result.error)}
        </Info>
        <Button type="button" variant="secondary" size="lg" className="w-full" onClick={reload}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (result.status === 'loading') {
    return (
      <p className="text-base text-navy-400" aria-live="polite">
        Cargando orden…
      </p>
    );
  }

  const order = result.order;
  const sourceLabel = order.sourceParentName
    ? `${order.sourceParentName} (${order.sourceParentId})`
    : order.sourceParentId;
  const destinationLabel = order.destinationParentName
    ? `${order.destinationParentName} (${order.destinationParentId})`
    : order.destinationParentId;
  const nextAction = mechanicNextAction(order);
  const showComplete = order.actions.canAddEvidence;

  async function handleAdd(kind: 'BEFORE' | 'AFTER', fileName: string) {
    const response = await addPhoto({ workOrderId: order.id, kind, fileName });
    if (!response.ok) {
      return response.error;
    }
    pushToast(`Foto ${kind === 'BEFORE' ? 'de antes' : 'de después'} agregada`, 'success');
    return null;
  }

  async function handleComplete() {
    setError(null);
    const response = await complete(
      {
        workOrderId: order.id,
        location: order.type === 'DISMANTLING' ? location : undefined,
      },
      order.type,
    );
    if (!response.ok) {
      setError(toMechanicUserMessage(response.error));
      return;
    }
  }

  return (
    <div className={showComplete ? 'space-y-4 pb-28' : 'space-y-4'}>
      <Link to="/mechanic/mine" className="inline-flex min-h-11 items-center text-base font-medium text-brand">
        ← Mis órdenes
      </Link>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">
            <Mono className="text-xl">{order.id}</Mono>
          </h1>
          <p className="mt-1 text-base text-navy">{order.pieceName}</p>
          <p className="text-sm text-navy-400">
            <Mono>{order.pieceId}</Mono>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <WOTypeChip type={order.type} />
          <WOStatusChip status={order.status} />
        </div>
      </div>

      <p className="text-base font-medium text-navy">{nextAction}</p>

      <Card className="space-y-2 text-base">
        <p>{contextLine(order.type, sourceLabel, destinationLabel)}</p>
        {order.effectiveLocation && <p>Ubicación efectiva: {order.effectiveLocation}</p>}
        {order.assignedMechanicName && <p>Asignado: {order.assignedMechanicName}</p>}
        {order.notes && <p>Notas: {order.notes}</p>}
      </Card>

      {order.status === 'COMPLETED' && (
        <Info tone="success" title="Orden completada">
          Esta orden ya no se modifica. Vuelva a Pendientes si hay más trabajo.
        </Info>
      )}

      {!order.actions.canAddEvidence && order.status === 'IN_PROGRESS' && (
        <Info tone="warning" title="Orden de otro mecánico">
          Puede consultar el contexto técnico, pero no puede cargar evidencia ni completar.
        </Info>
      )}

      {order.status === 'PENDING' && (
        <Info tone="info" title="Pendiente de toma">
          Tómela desde la cola de Pendientes para asignársela y poder completar.
        </Info>
      )}

      {error && (
        <Info tone="error" title="No se pudo guardar">
          {error}
        </Info>
      )}

      <EvidencePanel
        beforePhotos={order.beforePhotos}
        afterPhotos={order.afterPhotos}
        canAdd={order.actions.canAddEvidence}
        disabled={isMutating}
        onAdd={handleAdd}
      />

      {order.type === 'DISMANTLING' && order.actions.canAddEvidence && (
        <Field
          label="Ubicación después del desarme"
          htmlFor="post-dismantling-location"
          hint="Opcional. Si la deja vacía, la ubicación queda pendiente."
        >
          <Input
            id="post-dismantling-location"
            value={location}
            enterKeyHint="done"
            autoComplete="off"
            inputMode="text"
            onChange={(event) => setLocation(event.target.value)}
            className="min-h-12 text-base"
          />
        </Field>
      )}

      {order.status === 'COMPLETED' && (
        <Link
          to="/mechanic/pending"
          className="block min-h-12 rounded-lg bg-brand py-3 text-center text-base font-medium text-white"
        >
          Ir a pendientes
        </Link>
      )}

      {showComplete && (
        <div className="sticky bottom-0 -mx-4 border-t border-navy-100 bg-white px-4 py-3">
          <Button
            size="lg"
            className="w-full"
            disabled={isMutating || !order.actions.canComplete}
            onClick={() => void handleComplete()}
          >
            {isCompleting ? 'Completando…' : completeActionLabel(order.type)}
          </Button>
          {!order.actions.canComplete && (
            <p className="mt-2 text-sm text-navy-400">
              Falta evidencia de antes o de después para completar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
