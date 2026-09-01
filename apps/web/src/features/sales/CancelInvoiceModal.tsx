import { useEffect, useState, type FormEvent } from 'react';

import type { InProgressCancelDecision, LinkedWorkOrderView } from '../../api/contracts/sales';
import type { PaymentMethod } from '../../api/contracts/entities';
import { Button, Field, Info, Input, Modal, Select, Textarea, money } from '../../shared/ui';
import { PAYMENT_METHOD_LABELS } from './labels';

export type CancelInvoiceModalProps = {
  open: boolean;
  paid: number;
  currency: 'DOP' | 'USD';
  workOrders: LinkedWorkOrderView[];
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: {
    reason: string;
    refundAmount?: number;
    refundMethod?: PaymentMethod;
    inProgressDecision?: InProgressCancelDecision;
  }) => void;
};

const METHODS: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER', 'CHECK'];

export function CancelInvoiceModal({
  open,
  paid,
  currency,
  workOrders,
  isSaving,
  error,
  onClose,
  onSubmit,
}: CancelInvoiceModalProps) {
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('CASH');
  const [inProgressDecision, setInProgressDecision] = useState<InProgressCancelDecision>('STOP');
  const hasInProgress = workOrders.some((order) => order.status === 'IN_PROGRESS');

  useEffect(() => {
    if (open) {
      setReason('');
      setRefundAmount(paid > 0 ? String(paid) : '');
      setRefundMethod('CASH');
      setInProgressDecision('STOP');
    }
  }, [open, paid]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      reason,
      refundAmount: refundAmount === '' ? undefined : Number(refundAmount),
      refundMethod: refundAmount === '' ? undefined : refundMethod,
      inProgressDecision: hasInProgress ? inProgressDecision : undefined,
    });
  }

  return (
    <Modal open={open} title="Cancelar factura" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Info tone="warning" title="La cancelación no borra el documento">
          Se conserva el historial y se restauran existencias elegibles según el estado de las OT de desarme.
        </Info>

        {workOrders.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-navy-100 bg-navy-50 px-3 py-2 text-sm text-navy">
            {workOrders.map((order) => (
              <li key={order.id}>
                {order.id} · {order.pieceName} · {order.status === 'PENDING' ? 'Pendiente (se cancela la OT)' : order.status === 'IN_PROGRESS' ? 'En proceso' : order.status === 'COMPLETED' ? 'Completada (queda independiente)' : order.status}
              </li>
            ))}
          </ul>
        )}

        {hasInProgress && (
          <Field label="Desarme en proceso" htmlFor="cancel-wo-decision">
            <Select
              id="cancel-wo-decision"
              value={inProgressDecision}
              onChange={(event) => setInProgressDecision(event.target.value as InProgressCancelDecision)}
            >
              <option value="STOP">Detener trabajo y cancelar la OT</option>
              <option value="CONTINUE">Cancelar la venta y continuar el desarme</option>
            </Select>
          </Field>
        )}

        <Field label="Motivo" htmlFor="cancel-reason">
          <Textarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            autoFocus
          />
        </Field>

        {paid > 0 && (
          <>
            <Field
              label="Reembolso"
              htmlFor="cancel-refund"
              hint={`Pagado ${money(paid, currency)}. Deje vacío si no registra devolución ahora.`}
            >
              <Input
                id="cancel-refund"
                type="number"
                step="0.01"
                min="0"
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
              />
            </Field>
            <Field label="Método de reembolso" htmlFor="cancel-refund-method">
              <Select
                id="cancel-refund-method"
                value={refundMethod}
                onChange={(event) => setRefundMethod(event.target.value as PaymentMethod)}
              >
                {METHODS.map((entry) => (
                  <option key={entry} value={entry}>
                    {PAYMENT_METHOD_LABELS[entry]}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

        {error && (
          <Info tone="error" title="No se pudo cancelar">
            {error}
          </Info>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cerrar
          </Button>
          <Button type="submit" variant="danger" disabled={isSaving}>
            {isSaving ? 'Cancelando…' : 'Confirmar cancelación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
