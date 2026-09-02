import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import { InvoiceStatusChip, PaymentChip } from '../../shared/domain';
import { Button, Card, Chip, Info, money, Mono } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';
import { CancelInvoiceModal } from './CancelInvoiceModal';
import { CurrencyCorrectionModal } from './CurrencyCorrectionModal';
import { InvoiceHistory } from './InvoiceHistory';
import { InvoiceLinesTable } from './InvoiceLinesTable';
import { PaymentHistory } from './PaymentHistory';
import { PdfPreviewModal } from './PdfPreviewModal';
import { PayModal } from './PayModal';
import { ProfitabilityPanel } from './ProfitabilityPanel';
import { useInvoiceDetail } from './useInvoiceDetail';

export function InvoiceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { result, isMutating, addPayment, cancelInvoice, correctCurrency } = useInvoiceDetail(id);
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (result.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar el detalle">
        {result.error.message}
      </Info>
    );
  }

  if (result.status === 'loading') {
    return (
      <p className="text-sm text-navy-400" aria-live="polite">
        Cargando factura…
      </p>
    );
  }

  const detail = result.detail;

  return (
    <>
      <PageHeader
        title={detail.number ?? detail.id}
        description={`${detail.customerName}${detail.customerRnc ? ` · ${detail.customerRnc}` : ''}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {detail.actions.canViewPdf && (
              <Button variant="secondary" onClick={() => setPdfOpen(true)}>
                Vista previa del documento
              </Button>
            )}
            {detail.actions.canPay && (
              <Button
                onClick={() => {
                  setActionError(null);
                  setPayOpen(true);
                }}
              >
                Registrar pago
              </Button>
            )}
            {detail.actions.canCorrectCurrency && (
              <Button
                variant="secondary"
                onClick={() => {
                  setActionError(null);
                  setCurrencyOpen(true);
                }}
              >
                Corregir moneda
              </Button>
            )}
            {detail.actions.canCancel && (
              <Button
                variant="danger"
                onClick={() => {
                  setActionError(null);
                  setCancelOpen(true);
                }}
              >
                Cancelar factura
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <InvoiceStatusChip status={detail.status} />
        {detail.status !== 'DRAFT' && <PaymentChip state={detail.paymentState} />}
        {detail.fiscal ? <Chip tone="brand">Fiscal</Chip> : <Chip>Sin comprobante fiscal</Chip>}
        <Chip>{detail.currency}</Chip>
        <Link to="/sales" className="text-sm text-brand hover:underline">
          Volver al listado
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">Total</p>
          <p className="mt-1 font-mono text-xl text-navy">{money(detail.total, detail.currency)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">Pagado</p>
          <p className="mt-1 font-mono text-xl text-navy">{money(detail.paid, detail.currency)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">Saldo</p>
          <p className="mt-1 font-mono text-xl text-navy">{money(detail.balance, detail.currency)}</p>
        </Card>
      </div>

      {detail.cancelReason && (
        <div className="mb-6">
          <Info tone="warning" title="Motivo de cancelación">
            {detail.cancelReason}
          </Info>
        </div>
      )}

      <div className="mb-8">
        <InvoiceLinesTable lines={detail.lines} currency={detail.currency} fiscal={detail.fiscal} />
      </div>

      {detail.linkedWorkOrders.length > 0 && (
        <section className="mb-8">
          <p className="mb-2 text-sm font-medium text-navy">Órdenes de trabajo vinculadas</p>
          <ul className="space-y-1 text-sm text-navy-400">
            {detail.linkedWorkOrders.map((order) => (
              <li key={order.id}>
                {user?.role === 'ADMINISTRATOR' ? (
                  <Link to={`/work-orders/${order.id}`} className="text-brand hover:underline">
                    <Mono>{order.id}</Mono>
                  </Link>
                ) : (
                  <Mono>{order.id}</Mono>
                )}{' '}
                · {order.pieceName} · {order.status}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-8">
        <PaymentHistory payments={detail.payments} currency={detail.currency} />
      </div>

      {detail.profitability && (
        <div className="mb-8">
          <ProfitabilityPanel view={detail.profitability} />
        </div>
      )}

      <InvoiceHistory events={detail.history} />

      <PayModal
        open={payOpen}
        invoiceId={detail.id}
        currency={detail.currency}
        balance={detail.balance}
        isSaving={isMutating}
        error={payOpen ? actionError : null}
        onClose={() => {
          if (!isMutating) {
            setPayOpen(false);
            setActionError(null);
          }
        }}
        onSubmit={async (input) => {
          const response = await addPayment({ invoiceId: detail.id, ...input });
          if (!response.ok) {
            setActionError(response.error.message);
            return;
          }
          setPayOpen(false);
        }}
      />

      <CancelInvoiceModal
        open={cancelOpen}
        paid={detail.paid}
        currency={detail.currency}
        workOrders={detail.linkedWorkOrders}
        isSaving={isMutating}
        error={cancelOpen ? actionError : null}
        onClose={() => {
          if (!isMutating) {
            setCancelOpen(false);
            setActionError(null);
          }
        }}
        onSubmit={async (input) => {
          const response = await cancelInvoice({ invoiceId: detail.id, ...input });
          if (!response.ok) {
            setActionError(response.error.message);
            return;
          }
          setCancelOpen(false);
        }}
      />

      <CurrencyCorrectionModal
        open={currencyOpen}
        current={detail.currency}
        isSaving={isMutating}
        error={currencyOpen ? actionError : null}
        onClose={() => {
          if (!isMutating) {
            setCurrencyOpen(false);
            setActionError(null);
          }
        }}
        onSubmit={async (input) => {
          const response = await correctCurrency({ invoiceId: detail.id, ...input });
          if (!response.ok) {
            setActionError(response.error.message);
            return;
          }
          setCurrencyOpen(false);
        }}
      />

      <PdfPreviewModal open={pdfOpen} detail={detail} onClose={() => setPdfOpen(false)} />
    </>
  );
}
