import { useEffect, useId, useState, type FormEvent } from 'react';

import type { PaymentMethod } from '../../api/contracts/entities';
import { Button, Field, Info, Input, Modal, Select, money } from '../../shared/ui';
import { PAYMENT_METHOD_LABELS } from './labels';

const METHODS: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER', 'CHECK'];

export type PayModalProps = {
  open: boolean;
  invoiceId: string;
  currency: 'DOP' | 'USD';
  balance: number;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: {
    amount: number;
    method: PaymentMethod;
    reference?: string;
    idempotencyKey: string;
  }) => void;
};

export function PayModal({
  open,
  invoiceId,
  currency,
  balance,
  isSaving,
  error,
  onClose,
  onSubmit,
}: PayModalProps) {
  const amountId = useId();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    if (open) {
      setAmount('');
      setMethod('CASH');
      setReference('');
      setIdempotencyKey(`${invoiceId}-${Date.now()}`);
    }
  }, [open, invoiceId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      amount: Number(amount),
      method,
      reference: reference.trim() || undefined,
      idempotencyKey,
    });
  }

  return (
    <Modal open={open} title="Registrar pago" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-navy-400">
          Saldo pendiente: <span className="font-mono text-navy">{money(balance, currency)}</span>
        </p>
        <Field label="Monto" htmlFor={amountId}>
          <Input
            id={amountId}
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label="Método" htmlFor="pay-method">
          <Select id="pay-method" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {METHODS.map((entry) => (
              <option key={entry} value={entry}>
                {PAYMENT_METHOD_LABELS[entry]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Referencia" htmlFor="pay-ref" hint="Opcional">
          <Input id="pay-ref" value={reference} onChange={(event) => setReference(event.target.value)} />
        </Field>

        {error && (
          <Info tone="error" title="No se pudo registrar el pago">
            {error}
          </Info>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cerrar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Registrando…' : 'Confirmar pago'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
