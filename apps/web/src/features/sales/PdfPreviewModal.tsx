import type { InvoiceDetailView } from '../../api/contracts/sales';
import { APP_NAME } from '../../shared/config/brand';
import { Button, Modal, money, Mono } from '../../shared/ui';
import { InvoiceLinesTable } from './InvoiceLinesTable';

export type PdfPreviewModalProps = {
  open: boolean;
  detail: InvoiceDetailView;
  onClose: () => void;
};

export function PdfPreviewModal({ open, detail, onClose }: PdfPreviewModalProps) {
  const itbisTotal = detail.lines.reduce((sum, line) => sum + line.itbis, 0);

  return (
    <Modal open={open} title="Vista previa de factura" onClose={onClose} size="lg">
      <div className="space-y-6 print:text-black" id="invoice-pdf-preview">
        <header className="flex items-start justify-between gap-4 border-b border-navy-100 pb-4">
          <div>
            <p className="text-lg font-bold text-navy">{APP_NAME}</p>
            <p className="text-xs text-navy-400">Documento interno · no es un comprobante fiscal DGII</p>
          </div>
          <div className="text-right">
            <Mono className="text-base font-semibold">{detail.number}</Mono>
            <p className="mt-1 font-mono text-sm text-navy">NCF: ______________________</p>
          </div>
        </header>

        <div className="grid gap-2 text-sm text-navy sm:grid-cols-2">
          <p>
            Cliente: <span className="font-medium">{detail.customerName}</span>
          </p>
          <p>RNC / Cédula: {detail.customerRnc ?? '—'}</p>
          <p>Moneda: {detail.currency}</p>
          <p>{detail.fiscal ? 'Factura con comprobante fiscal (ITBIS 18% incluido)' : 'Sin comprobante fiscal'}</p>
        </div>

        <InvoiceLinesTable lines={detail.lines} currency={detail.currency} fiscal={detail.fiscal} />

        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-navy-400">ITBIS</span>
            <span className="font-mono">
              {detail.fiscal ? money(itbisTotal, detail.currency) : money(0, detail.currency)}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-navy">
            <span>Total</span>
            <span className="font-mono">{money(detail.total, detail.currency)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        <Button onClick={() => window.print()}>Imprimir</Button>
      </div>
    </Modal>
  );
}
