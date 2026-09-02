import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { PageHeader } from '../../shared/layout/PageHeader';
import { AssemblyKindChip, RelationChip } from '../../shared/domain';
import { Button, Card, Chip, Info, money, useToast } from '../../shared/ui';
import { AddLineModal } from './AddLineModal';
import { AssemblyTree } from './AssemblyTree';
import { ConfirmSaleModal } from './ConfirmSaleModal';
import { DocumentPanel } from './DocumentPanel';
import { LINE_TYPE_LABELS } from './labels';
import { PriceCell } from './PriceCell';
import { TotalsPanel } from './TotalsPanel';
import { usePos } from './usePos';

export function PosPage() {
  const { id } = useParams();
  const pos = usePos(id);
  const { pushToast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [discardError, setDiscardError] = useState<string | null>(null);

  if (pos.result.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar el punto de venta">
        {pos.result.error.message}
      </Info>
    );
  }

  if (pos.result.status === 'loading') {
    return (
      <p className="text-sm text-navy-400" aria-live="polite">
        Cargando borrador…
      </p>
    );
  }

  const draft = pos.result.draft;
  const readOnly = draft.status !== 'DRAFT';

  async function handleAddLine(input: Parameters<typeof pos.addLine>[0]) {
    setAddError(null);
    const response = await pos.addLine(input);
    if (!response.ok) {
      setAddError(response.error.message);
      return;
    }
    setAddOpen(false);
    pushToast('Línea agregada', 'success');
  }

  return (
    <>
      <PageHeader
        title="Punto de venta"
        description={
          readOnly
            ? `Factura ${draft.number ?? draft.id} confirmada. Pagos y vista previa del documento están en el detalle.`
            : 'Edite el borrador, asigne precios y confirme. El inventario se reserva hasta confirmar o descartar.'
        }
        actions={
          !readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={pos.isMutating} onClick={() => setAddOpen(true)}>
                Agregar línea
              </Button>
              <Button
                variant="danger"
                disabled={pos.isMutating}
                onClick={async () => {
                  setDiscardError(null);
                  const response = await pos.discard();
                  if (!response.ok) {
                    setDiscardError(response.error.message);
                  }
                }}
              >
                Descartar borrador
              </Button>
              <Button
                disabled={pos.isMutating || draft.blockers.length > 0}
                onClick={() => {
                  setConfirmError(null);
                  setConfirmOpen(true);
                }}
              >
                Confirmar venta
              </Button>
            </div>
          )
        }
      />

      {discardError && (
        <div className="mb-4">
          <Info tone="error" title="No se pudo descartar">
            {discardError}
          </Info>
        </div>
      )}

      {readOnly && (
        <div className="mb-6">
          <Info tone="success" title={`Factura ${draft.number} confirmada`}>
            Cliente {draft.customerName}. Total {money(draft.totals.gross, draft.currency)}.
            {draft.createdWorkOrderIds.length > 0
              ? ` Orden de desarme: ${draft.createdWorkOrderIds.join(', ')}.`
              : ''}{' '}
            <Link to={`/sales/${draft.id}`} className="font-medium text-brand hover:underline">
              Ver detalle
            </Link>
          </Info>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-navy">Líneas</h2>
              <Chip>{draft.id}</Chip>
              {draft.fiscal ? <Chip tone="brand">Fiscal</Chip> : <Chip>Sin comprobante fiscal</Chip>}
            </div>
            {draft.lines.length === 0 ? (
              <p className="text-sm text-navy-400">No hay líneas. Agregue inventario o una línea libre.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-navy-100 text-navy-400">
                      <th className="py-2 pr-3 font-medium">Descripción</th>
                      <th className="py-2 pr-3 font-medium">Tipo</th>
                      <th className="py-2 pr-3 font-medium">Cantidad</th>
                      <th className="py-2 pr-3 font-medium">Precio</th>
                      <th className="py-2 pr-3 font-medium">Impuesto ITBIS</th>
                      <th className="py-2 pr-3 font-medium">Total</th>
                      {!readOnly && <th className="py-2 font-medium"> </th>}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.lines.map((line) => (
                      <tr key={line.id} className="border-b border-navy-50 align-top">
                        <td className="py-3 pr-3">
                          <div className="font-medium text-navy">{line.description}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {line.installed && (
                              <RelationChip relationship="INSTALLED" parentName={line.parentName} />
                            )}
                            {line.isAssembly && <AssemblyKindChip isAssembly />}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <Chip>{LINE_TYPE_LABELS[line.type]}</Chip>
                        </td>
                        <td className="py-3 pr-3 text-navy">{line.quantity}</td>
                        <td className="py-3 pr-3">
                          {readOnly ? (
                            money(line.unitPrice, draft.currency)
                          ) : (
                            <PriceCell
                              lineId={line.id}
                              value={line.unitPrice}
                              pending={line.pricePending}
                              disabled={pos.isMutating}
                              onCommit={(lineId, unitPrice) => {
                                void pos.setLinePrice(lineId, unitPrice);
                              }}
                            />
                          )}
                        </td>
                        <td className="py-3 pr-3 text-navy">
                          {line.taxable && draft.fiscal ? money(line.itbis, draft.currency) : '—'}
                        </td>
                        <td className="py-3 pr-3 font-medium text-navy">
                          {money(line.gross, draft.currency)}
                        </td>
                        {!readOnly && (
                          <td className="py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={pos.isMutating}
                              onClick={() => {
                                void pos.removeLine(line.id);
                              }}
                            >
                              Quitar
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {draft.lines
            .filter((line) => line.isAssembly && line.tree && line.itemId)
            .map((line) => (
              <AssemblyTree key={line.id} tree={line.tree!} currentId={line.itemId!} />
            ))}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-navy">Documento</h2>
            <DocumentPanel
              draft={draft}
              readOnly={readOnly}
              isMutating={pos.isMutating}
              error={metaError}
              onCustomerChange={(customerId) => {
                setMetaError(null);
                void pos.setMeta({ customerId }).then((response) => {
                  if (!response.ok) {
                    setMetaError(response.error.message);
                  }
                });
              }}
              onCurrencyChange={(currency) => {
                setMetaError(null);
                void pos.setMeta({ currency }).then((response) => {
                  if (!response.ok) {
                    setMetaError(response.error.message);
                  }
                });
              }}
              onFiscalChange={(fiscal) => {
                setMetaError(null);
                void pos.setMeta({ fiscal }).then((response) => {
                  if (!response.ok) {
                    setMetaError(response.error.message);
                  }
                });
              }}
            />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-navy">Totales</h2>
            <TotalsPanel totals={draft.totals} currency={draft.currency} fiscal={draft.fiscal} />
          </Card>
        </div>
      </div>

      <AddLineModal
        open={addOpen}
        draft={draft}
        isSaving={pos.isMutating}
        error={addError}
        onClose={() => {
          if (!pos.isMutating) {
            setAddOpen(false);
            setAddError(null);
          }
        }}
        onSubmit={handleAddLine}
      />

      <ConfirmSaleModal
        open={confirmOpen}
        draft={draft}
        isConfirming={pos.isMutating}
        error={confirmError}
        onClose={() => {
          if (!pos.isMutating) {
            setConfirmOpen(false);
            setConfirmError(null);
          }
        }}
        onConfirm={() => {
          void pos.confirm().then((response) => {
            if (!response.ok) {
              setConfirmError(response.error.message);
              return;
            }
            setConfirmOpen(false);
            pushToast('Venta confirmada', 'success');
          });
        }}
      />
    </>
  );
}
