import { useEffect, useId, useRef, useState } from 'react';

import type { PaymentMethod } from '../../api/contracts/entities';
import type { ConfirmInvoicePayment, PosDraftView } from '../../api/contracts/sales';
import { useAppCapabilities } from '../../shared/config/CapabilitiesProvider';
import { Button, Field, Input, Modal, Select, money } from '../../shared/ui';
import { PAYMENT_METHOD_LABELS } from './labels';

const METHODS: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER', 'CHECK'];

type ConfirmSaleModalProps = {
  open: boolean;
  draft: PosDraftView;
  isConfirming: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (payment?: ConfirmInvoicePayment) => void;
};

export function ConfirmSaleModal({
  open,
  draft,
  isConfirming,
  error,
  onClose,
  onConfirm,
}: ConfirmSaleModalProps) {
  const capabilities = useAppCapabilities();
  const amountId = useId();
  const includeId = useId();
  const installed = draft.lines.filter((line) => line.installed);
  const [includeInitialPayment, setIncludeInitialPayment] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const submitLock = useRef(false);

  useEffect(() => {
    if (open) {
      setIncludeInitialPayment(false);
      setAmount('');
      setMethod('CASH');
      setReference('');
      submitLock.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!isConfirming) {
      submitLock.current = false;
    }
  }, [isConfirming]);

  function handleConfirm() {
    if (isConfirming || submitLock.current || draft.blockers.length > 0) {
      return;
    }
    submitLock.current = true;

    const trimmed = amount.trim();
    if (!capabilities.payments || !includeInitialPayment || trimmed === '') {
      onConfirm();
      return;
    }

    onConfirm({
      amount: Number(trimmed),
      method,
      reference: reference.trim() || undefined,
    });
  }

  return (
    <Modal open={open} title="Confirmar venta" onClose={onClose}>
      <div className="flex flex-col gap-4 text-sm text-navy">
        {error && (
          <p className="text-red-600" role="alert">
            {error}
          </p>
        )}
        <p>
          Se emitirá una factura interna {draft.fiscal ? 'con comprobante fiscal' : 'sin comprobante fiscal'}{' '}
          para <strong>{draft.customerName}</strong>.
        </p>
        <p>
          Total {money(draft.totals.gross, draft.currency)} · Impuesto ITBIS{' '}
          {money(draft.totals.itbis, draft.currency)}
        </p>
        {capabilities.workOrders && installed.length > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            Hay {installed.length} pieza(s) instalada(s). Al confirmar quedarán vendidas e instaladas y se
            abrirá una orden de desarme pendiente.
          </p>
        )}
        {draft.blockers.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-red-700">
            {draft.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        )}

        {capabilities.payments && (
          <>
            <label htmlFor={includeId} className="flex items-center gap-2 font-medium">
              <input
                id={includeId}
                type="checkbox"
                checked={includeInitialPayment}
                onChange={(event) => setIncludeInitialPayment(event.target.checked)}
                disabled={isConfirming}
              />
              Pago inicial
            </label>
            <p className="text-xs text-navy-400">
              Sin marcar o sin monto, la venta queda a crédito (sin pago).
            </p>
            {includeInitialPayment && (
              <div className="space-y-3">
                <Field label="Monto" htmlFor={amountId} hint={`Hasta ${money(draft.totals.gross, draft.currency)}`}>
                  <Input
                    id={amountId}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    autoFocus
                  />
                </Field>
                <Field label="Método" htmlFor="confirm-pay-method">
                  <Select
                    id="confirm-pay-method"
                    value={method}
                    onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                  >
                    {METHODS.map((entry) => (
                      <option key={entry} value={entry}>
                        {PAYMENT_METHOD_LABELS[entry]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Referencia" htmlFor="confirm-pay-ref" hint="Opcional">
                  <Input
                    id="confirm-pay-ref"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                  />
                </Field>
              </div>
            )}
          </>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isConfirming}>
            Volver
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || draft.blockers.length > 0}
          >
            {isConfirming ? 'Confirmando…' : 'Confirmar venta'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
