import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type { Currency } from '../../api/contracts/entities';
import type { PosDraftView, PosLineView } from '../../api/contracts/sales';
import { PageHeader } from '../../shared/layout/PageHeader';
import { useMediaQuery } from '../../shared/layout/useMediaQuery';
import { AssemblyKindChip, RelationChip } from '../../shared/domain';
import { useAppCapabilities } from '../../shared/config/CapabilitiesProvider';
import { UNDO_TOAST_DURATION_MS, UX_TERMS } from '../../shared/copy/glossary';
import { Button, Card, Chip, Info, money, useToast } from '../../shared/ui';
import { AddLineModal } from './AddLineModal';
import { AssemblyTree } from './AssemblyTree';
import { ConfirmSaleModal } from './ConfirmSaleModal';
import { DocumentPanel } from './DocumentPanel';
import { LINE_TYPE_LABELS } from './labels';
import {
  firstPosProblemElementId,
  focusPosElement,
  POS_DRAFT_DISCARDED_TOAST,
  POS_FIELD_IDS,
  POS_LINE_REMOVED_TOAST,
  POS_UNDO_LABEL,
  POS_VIEW_REQUIREMENTS_LABEL,
  posBlockedConfirmSummary,
  posDraftDescription,
  posEmptyLinesMessage,
  posLinePriceFieldId,
  posLineSku,
  toPosUserMessage,
} from './pos-copy';
import { PriceCell } from './PriceCell';
import { TotalsPanel } from './TotalsPanel';
import { restoreDiscardedDraft, snapshotPosDraft, snapshotPosLine, usePos } from './usePos';

/** Tailwind `lg` — table on desktop, cards on tablet/mobile. */
const POS_LINES_TABLE_MIN_WIDTH_PX = 1024;

export function PosPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pos = usePos(id);
  const capabilities = useAppCapabilities();
  const { pushToast } = useToast();
  const isDesktopLines = useMediaQuery(`(min-width: ${POS_LINES_TABLE_MIN_WIDTH_PX}px)`, true);
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
  const confirmBlocked = draft.blockers.length > 0;
  const blockedSummary = posBlockedConfirmSummary(draft.blockers);

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

  async function handleRemoveLine(line: PosLineView) {
    const snapshot = snapshotPosLine(line);
    const response = await pos.removeLine(line.id);
    if (!response.ok) {
      pushToast(toPosUserMessage(response.error), 'error');
      return;
    }
    pushToast(POS_LINE_REMOVED_TOAST, 'success', {
      durationMs: UNDO_TOAST_DURATION_MS,
      action: {
        label: POS_UNDO_LABEL,
        onClick: () => {
          void pos.restoreRemovedLine(snapshot).then((restored) => {
            if (!restored.ok) {
              pushToast(toPosUserMessage(restored.error), 'error');
            }
          });
        },
      },
    });
  }

  async function handleDiscardDraft() {
    setDiscardError(null);
    if (draft.lines.length === 0) {
      const response = await pos.discard();
      if (!response.ok) {
        setDiscardError(toPosUserMessage(response.error));
      }
      return;
    }

    const snapshot = snapshotPosDraft(draft);
    const response = await pos.discard();
    if (!response.ok) {
      setDiscardError(toPosUserMessage(response.error));
      return;
    }

    pushToast(POS_DRAFT_DISCARDED_TOAST, 'success', {
      durationMs: UNDO_TOAST_DURATION_MS,
      action: {
        label: POS_UNDO_LABEL,
        onClick: () => {
          void restoreDiscardedDraft(snapshot).then((restored) => {
            if (!restored.ok) {
              pushToast(toPosUserMessage(restored.error), 'error');
              return;
            }
            navigate(`/sales/draft/${restored.value}`);
          });
        },
      },
    });
  }

  function handleViewRequirements() {
    const elementId = firstPosProblemElementId(draft);
    if (elementId) {
      focusPosElement(elementId);
    }
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
              <div className="flex flex-wrap items-start justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pos.isMutating}
                  onClick={() => setAddOpen(true)}
                >
                  Agregar línea
                </Button>
                <div className="flex flex-col items-end gap-1">
                  <Button
                    size="lg"
                    disabled={pos.isMutating || confirmBlocked}
                    busy={pos.isMutating}
                    aria-describedby={confirmBlocked ? 'pos-confirm-block-reason' : undefined}
                    onClick={() => {
                      setConfirmError(null);
                      setConfirmOpen(true);
                    }}
                  >
                    Confirmar venta
                  </Button>
                  {confirmBlocked && blockedSummary && (
                    <div className="flex max-w-xs flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm text-amber-800">
                      <span id="pos-confirm-block-reason">{blockedSummary}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto min-h-0 px-0 py-0 text-sm font-semibold text-brand hover:bg-transparent"
                        onClick={handleViewRequirements}
                      >
                        {POS_VIEW_REQUIREMENTS_LABEL}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-end text-red-700 hover:bg-red-50"
                disabled={pos.isMutating}
                onClick={() => {
                  void handleDiscardDraft();
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
              ? ` Orden de ${UX_TERMS.dismantling.toLowerCase()}: ${draft.createdWorkOrderIds.join(', ')}.`
              : ''}{' '}
            <Link to={`/sales/${draft.id}`} className="font-medium text-brand hover:underline">
              Ver detalle
            </Link>
          </Info>
        </div>
      )}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card id={POS_FIELD_IDS.lines} tabIndex={-1} className="outline-none">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-navy">Líneas</h2>
              <Chip>{draft.id}</Chip>
              {draft.fiscal ? (
                <Chip tone="brand">Fiscal</Chip>
              ) : (
                <Chip>Sin comprobante fiscal</Chip>
              )}
            </div>
            {draft.lines.length === 0 ? (
              <p className="text-sm text-navy-400">{posEmptyLinesMessage(capabilities)}</p>
            ) : isDesktopLines ? (
              <DraftLinesTable
                draft={draft}
                readOnly={readOnly}
                isMutating={pos.isMutating}
                onSetPrice={(lineId, unitPrice) => {
                  void pos.setLinePrice(lineId, unitPrice);
                }}
                onRemove={handleRemoveLine}
              />
            ) : (
              <DraftLineCards
                draft={draft}
                readOnly={readOnly}
                isMutating={pos.isMutating}
                onSetPrice={(lineId, unitPrice) => {
                  void pos.setLinePrice(lineId, unitPrice);
                }}
                onRemove={handleRemoveLine}
              />
            )}
          </Card>

          {draft.lines
            .filter((line) => line.isAssembly && line.tree && line.itemId)
            .map((line) => (
              <AssemblyTree key={line.id} tree={line.tree!} currentId={line.itemId!} />
            ))}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
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
              <div id={POS_FIELD_IDS.blockers} tabIndex={-1} className="mb-4 outline-none">
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
    </>
  );
}

type DraftLinesProps = {
  draft: PosDraftView;
  readOnly: boolean;
  isMutating: boolean;
  onSetPrice: (lineId: string, unitPrice: number) => void;
  onRemove: (line: PosLineView) => void;
};

function DraftLinesTable({ draft, readOnly, isMutating, onSetPrice, onRemove }: DraftLinesProps) {
  return (
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
                <LineDescription line={line} />
              </td>
              <td className="py-3 pr-3">
                <Chip>{LINE_TYPE_LABELS[line.type]}</Chip>
              </td>
              <td className="py-3 pr-3 text-navy">{line.quantity}</td>
              <td className="py-3 pr-3">
                <LinePrice
                  line={line}
                  currency={draft.currency}
                  readOnly={readOnly}
                  disabled={isMutating}
                  onCommit={onSetPrice}
                />
              </td>
              <td className="py-3 pr-3 text-navy">
                {line.taxable && draft.fiscal ? money(line.itbis, draft.currency) : '—'}
              </td>
              <td className="py-3 pr-3 font-medium text-navy">
                {money(line.gross, draft.currency)}
              </td>
              {!readOnly && (
                <td className="py-3">
                  <RemoveLineButton disabled={isMutating} onClick={() => onRemove(line)} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DraftLineCards({ draft, readOnly, isMutating, onSetPrice, onRemove }: DraftLinesProps) {
  return (
    <ul className="flex flex-col gap-3">
      {draft.lines.map((line) => {
        const sku = posLineSku(line);
        return (
          <li key={line.id}>
            <Card padding="sm">
              <div className="font-medium text-navy">{line.description}</div>
              <p className="mt-1 text-sm text-navy-400">
                {LINE_TYPE_LABELS[line.type]}
                {sku ? ` · ${sku}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {line.installed && (
                  <RelationChip relationship="INSTALLED" parentName={line.parentName} />
                )}
                {line.isAssembly && <AssemblyKindChip isAssembly />}
              </div>
              <dl className="mt-3 space-y-2 text-sm text-navy">
                <div className="flex justify-between gap-3">
                  <dt className="text-navy-400">Cantidad</dt>
                  <dd>{line.quantity}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="pt-2 text-navy-400">Precio</dt>
                  <dd className="min-w-[8rem]">
                    <LinePrice
                      line={line}
                      currency={draft.currency}
                      readOnly={readOnly}
                      disabled={isMutating}
                      onCommit={onSetPrice}
                    />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-navy-400">ITBIS</dt>
                  <dd>{line.taxable && draft.fiscal ? money(line.itbis, draft.currency) : '—'}</dd>
                </div>
                <div className="flex justify-between gap-3 font-medium">
                  <dt>Total</dt>
                  <dd>{money(line.gross, draft.currency)}</dd>
                </div>
              </dl>
              {!readOnly && (
                <div className="mt-3">
                  <RemoveLineButton disabled={isMutating} onClick={() => onRemove(line)} />
                </div>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function LineDescription({ line }: { line: PosLineView }) {
  return (
    <>
      <div className="font-medium text-navy">{line.description}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {line.installed && <RelationChip relationship="INSTALLED" parentName={line.parentName} />}
        {line.isAssembly && <AssemblyKindChip isAssembly />}
      </div>
    </>
  );
}

function LinePrice({
  line,
  currency,
  readOnly,
  disabled,
  onCommit,
}: {
  line: PosLineView;
  currency: Currency;
  readOnly: boolean;
  disabled: boolean;
  onCommit: (lineId: string, unitPrice: number) => void;
}) {
  return (
    <div id={posLinePriceFieldId(line.id)} data-pos-field="price">
      {readOnly ? (
        money(line.unitPrice, currency)
      ) : (
        <PriceCell
          lineId={line.id}
          value={line.unitPrice}
          pending={line.pricePending}
          disabled={disabled}
          onCommit={onCommit}
        />
      )}
    </div>
  );
}

function RemoveLineButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" disabled={disabled} onClick={onClick}>
      Quitar
    </Button>
  );
}
