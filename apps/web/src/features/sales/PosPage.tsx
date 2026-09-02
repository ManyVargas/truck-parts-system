import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { PageHeader } from '../../shared/layout/PageHeader';
import { AssemblyKindChip, RelationChip } from '../../shared/domain';
import { useAppCapabilities } from '../../shared/config/CapabilitiesProvider';
import { Button, Card, Chip, Info, Modal, money, useToast } from '../../shared/ui';
import { AddLineModal } from './AddLineModal';
import { AssemblyTree } from './AssemblyTree';
import { ConfirmSaleModal } from './ConfirmSaleModal';
import { DocumentPanel } from './DocumentPanel';
import { LINE_TYPE_LABELS } from './labels';
import { posDraftDescription, posEmptyLinesMessage, toPosUserMessage } from './pos-copy';
import { PriceCell } from './PriceCell';
import { TotalsPanel } from './TotalsPanel';
import { usePos } from './usePos';

export function PosPage() {
  const { id } = useParams();
  const pos = usePos(id);
  const capabilities = useAppCapabilities();
  const { pushToast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
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
      setAddError(toPosUserMessage(response.error));
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
            ? `Factura ${draft.number ?? draft.id} confirmada. ${
                capabilities.payments
                  ? 'Pagos y vista previa del documento están en el detalle.'
                  : 'La vista previa del documento está en el detalle.'
              }`
            : posDraftDescription(capabilities)
        }
        actions={
          !readOnly && (
            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pos.isMutating}
                  onClick={() => setAddOpen(true)}
                >
                  Agregar línea
                </Button>
                <Button
                  size="lg"
                  disabled={pos.isMutating || draft.blockers.length > 0}
                  onClick={() => {
                    setConfirmError(null);
                    setConfirmOpen(true);
                  }}
                >
                  Confirmar venta
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-end text-red-700 hover:bg-red-50"
                disabled={pos.isMutating}
                onClick={() => {
                  setDiscardError(null);
                  if (draft.lines.length === 0) {
                    void pos.discard().then((response) => {
                      if (!response.ok) {
                        setDiscardError(toPosUserMessage(response.error));
                      }
                    });
                    return;
                  }
                  setDiscardOpen(true);
                }}
              >
                Descartar borrador
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
            {draft.createdWorkOrderIds.length > 0 && capabilities.workOrders
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
              <p className="text-sm text-navy-400">{posEmptyLinesMessage(capabilities)}</p>
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
                    setMetaError(toPosUserMessage(response.error));
                  }
                });
              }}
              onCurrencyChange={(currency) => {
                setMetaError(null);
                void pos.setMeta({ currency }).then((response) => {
                  if (!response.ok) {
                    setMetaError(toPosUserMessage(response.error));
                  }
                });
              }}
              onFiscalChange={(fiscal) => {
                setMetaError(null);
                void pos.setMeta({ fiscal }).then((response) => {
                  if (!response.ok) {
                    setMetaError(toPosUserMessage(response.error));
                  }
                });
              }}
            />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-navy">Totales</h2>
            {draft.blockers.length > 0 && !readOnly && (
              <div className="mb-4">
                <Info tone="warning" title="No se puede confirmar todavía">
                  <ul className="list-disc space-y-1 pl-5">
                    {draft.blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </Info>
              </div>
            )}
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
        onConfirm={(payment) => {
          void pos.confirm(payment).then((response) => {
            if (!response.ok) {
              setConfirmError(toPosUserMessage(response.error));
              return;
            }
            setConfirmOpen(false);
            pushToast('Venta confirmada', 'success');
          });
        }}
      />

      <Modal
        open={discardOpen}
        title="Descartar borrador"
        onClose={() => {
          if (!pos.isMutating) {
            setDiscardOpen(false);
          }
        }}
      >
        <div className="flex flex-col gap-4 text-sm text-navy">
          <p>
            Se perderán las líneas de este borrador. Esta acción no se puede deshacer desde el punto de
            venta.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={pos.isMutating}
              onClick={() => setDiscardOpen(false)}
            >
              Seguir editando
            </Button>
            <Button
              variant="danger"
              disabled={pos.isMutating}
              onClick={() => {
                void pos.discard().then((response) => {
                  if (!response.ok) {
                    setDiscardOpen(false);
                    setDiscardError(toPosUserMessage(response.error));
                    return;
                  }
                  setDiscardOpen(false);
                });
              }}
            >
              {pos.isMutating ? 'Descartando…' : 'Sí, descartar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
