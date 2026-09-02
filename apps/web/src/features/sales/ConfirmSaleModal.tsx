import { Button, Modal, money } from '../../shared/ui';
import type { PosDraftView } from '../../api/contracts/sales';

type ConfirmSaleModalProps = {
  open: boolean;
  draft: PosDraftView;
  isConfirming: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmSaleModal({
  open,
  draft,
  isConfirming,
  error,
  onClose,
  onConfirm,
}: ConfirmSaleModalProps) {
  const installed = draft.lines.filter((line) => line.installed);

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
        {installed.length > 0 && (
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
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isConfirming}>
            Volver
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isConfirming || draft.blockers.length > 0}
          >
            {isConfirming ? 'Confirmando…' : 'Confirmar venta'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
