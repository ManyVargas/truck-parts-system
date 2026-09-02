import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { QtyProductDetailView } from '../../api/contracts/inventory';
import { CommercialChip, ReservationChip } from '../../shared/domain';
import { Button, Card, Field, Info, Input, Modal, Mono, SectionTitle, Textarea, money } from '../../shared/ui';
import { PhotoGrid } from './PhotoGrid';

export function QtyProductDetail({
  detail,
  actions,
  canReceive,
  canAdjust,
  isMutating,
  onReceive,
  onAdjust,
}: {
  detail: QtyProductDetailView;
  actions: ReactNode;
  canReceive: boolean;
  canAdjust: boolean;
  isMutating: boolean;
  onReceive: (input: { quantity: number; unitCostDop: number }) => Promise<string | null>;
  onAdjust: (input: { difference: number; reason: string }) => Promise<string | null>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-navy-400">
            <Link to="/inventory" className="text-brand hover:underline">
              Inventario
            </Link>
            {' / '}
            <Mono>{detail.id}</Mono>
          </p>
          <h1 className="mt-1 text-3xl font-bold text-navy">{detail.name}</h1>
          <p className="mt-1 text-navy-400">
            Producto por cantidad · {detail.categoryName}
            {detail.brand ? ` · ${detail.brand}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {actions}
          {(canReceive || canAdjust) && (
            <div className="flex flex-col gap-2">
              {error && !receiveOpen && !adjustOpen && (
                <Info tone="error" title="No se pudo completar la acción">
                  {error}
                </Info>
              )}
              {canReceive && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => {
                    setError(null);
                    setReceiveOpen(true);
                  }}
                >
                  Registrar entrada
                </Button>
              )}
              {canAdjust && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => {
                    setError(null);
                    setAdjustOpen(true);
                  }}
                >
                  Ajustar existencia
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Existencia" />
          <div className="mb-4 flex flex-wrap gap-1.5">
            <CommercialChip state={detail.commercialState} />
            <ReservationChip reserved={detail.reserved > 0} />
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-navy-400">En existencia</dt>
              <dd className="font-mono text-lg text-navy">{detail.onHand}</dd>
            </div>
            <div>
              <dt className="text-navy-400">Reservado</dt>
              <dd className="font-mono text-lg text-navy">{detail.reserved}</dd>
            </div>
            <div>
              <dt className="text-navy-400">Disponible</dt>
              <dd className="font-mono text-lg text-navy">{detail.availableToReserve}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-navy-400">disponible = existencia − reservado</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-navy-400">Ubicación</dt>
              <dd>{detail.location ?? 'Pendiente'}</dd>
            </div>
            <div>
              <dt className="text-navy-400">Costo unitario promedio</dt>
              <dd className="font-mono">{money(detail.unitCostDop)}</dd>
            </div>
          </dl>
        </Card>
        <PhotoGrid photos={detail.photos} />
      </div>

      <Modal
        open={receiveOpen}
        title="Registrar entrada de stock"
        onClose={() => {
          setError(null);
          setReceiveOpen(false);
        }}
      >
        <div className="space-y-3">
          {error && (
            <Info tone="error" title="No se pudo registrar la entrada">
              {error}
            </Info>
          )}
          <ReceiveQtyForm
            disabled={isMutating}
            onCancel={() => {
              setError(null);
              setReceiveOpen(false);
            }}
            onSubmit={async (input) => {
              const message = await onReceive(input);
              if (message) {
                setError(message);
                return;
              }
              setError(null);
              setReceiveOpen(false);
            }}
          />
        </div>
      </Modal>

      <Modal
        open={adjustOpen}
        title="Ajustar existencia"
        onClose={() => {
          setError(null);
          setAdjustOpen(false);
        }}
      >
        <div className="space-y-3">
          {error && (
            <Info tone="error" title="No se pudo ajustar la existencia">
              {error}
            </Info>
          )}
          <AdjustQtyForm
            onHand={detail.onHand}
            reserved={detail.reserved}
            disabled={isMutating}
            onCancel={() => {
              setError(null);
              setAdjustOpen(false);
            }}
            onSubmit={async (input) => {
              const message = await onAdjust(input);
              if (message) {
                setError(message);
                return;
              }
              setError(null);
              setAdjustOpen(false);
            }}
          />
        </div>
      </Modal>
    </div>
  );
}

function ReceiveQtyForm({
  disabled,
  onCancel,
  onSubmit,
}: {
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (input: { quantity: number; unitCostDop: number }) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState('');
  const [unitCostDop, setUnitCostDop] = useState('');

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          quantity: Number(quantity),
          unitCostDop: Number(unitCostDop),
        });
      }}
    >
      <Field label="Cantidad" htmlFor="qty-receive-qty">
        <Input
          id="qty-receive-qty"
          type="number"
          min={1}
          step={1}
          required
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
      </Field>
      <Field label="Costo unitario DOP" htmlFor="qty-receive-cost">
        <Input
          id="qty-receive-cost"
          type="number"
          min={0}
          step="0.01"
          required
          value={unitCostDop}
          onChange={(event) => setUnitCostDop(event.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          Registrar entrada
        </Button>
      </div>
    </form>
  );
}

function AdjustQtyForm({
  onHand,
  reserved,
  disabled,
  onCancel,
  onSubmit,
}: {
  onHand: number;
  reserved: number;
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (input: { difference: number; reason: string }) => Promise<void>;
}) {
  const [difference, setDifference] = useState('');
  const [reason, setReason] = useState('');

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          difference: Number(difference),
          reason,
        });
      }}
    >
      <p className="text-sm text-navy-400">
        Existencia {onHand} · reservado {reserved}. La diferencia no puede dejar la existencia por
        debajo de lo reservado.
      </p>
      <Field label="Diferencia" htmlFor="qty-adjust-diff">
        <Input
          id="qty-adjust-diff"
          type="number"
          step={1}
          required
          value={difference}
          onChange={(event) => setDifference(event.target.value)}
        />
      </Field>
      <Field label="Motivo" htmlFor="qty-adjust-reason">
        <Textarea
          id="qty-adjust-reason"
          required
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          Guardar ajuste
        </Button>
      </div>
    </form>
  );
}
