import type { PaymentView } from '../../api/contracts/sales';
import type { Currency } from '../../api/contracts/entities';
import { Chip, Empty, money, SectionTitle } from '../../shared/ui';
import { PAYMENT_METHOD_LABELS } from './labels';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-DO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export type PaymentHistoryProps = {
  payments: PaymentView[];
  currency: Currency;
};

export function PaymentHistory({ payments, currency }: PaymentHistoryProps) {
  const ordered = [...payments].sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  return (
    <section>
      <SectionTitle title="Pagos y reembolsos" subtitle="Historial aditivo; los recibos no se sobrescriben" />

      {ordered.length === 0 ? (
        <Empty title="Sin movimientos registrados" description="Esta factura no tiene pagos en el libro." />
      ) : (
        <ul className="divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-100 bg-white">
          {ordered.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <Chip tone={payment.kind === 'REFUND' ? 'danger' : 'success'}>
                    {payment.kind === 'REFUND' ? 'Reembolso' : 'Pago'}
                  </Chip>
                  <span className="text-sm text-navy">{PAYMENT_METHOD_LABELS[payment.method]}</span>
                </div>
                <p className="mt-0.5 text-xs text-navy-400">
                  {DATE_FORMATTER.format(new Date(payment.createdAt))}
                  {payment.reference ? ` · ${payment.reference}` : ''}
                </p>
              </div>
              <span className="font-mono text-sm text-navy">{money(payment.amount, currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
