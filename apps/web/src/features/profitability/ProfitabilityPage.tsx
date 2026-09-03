import { useState } from 'react';

import type { ProfitabilityInvoiceRow } from '../../api/contracts/profitability';
import { FxStatusChip } from '../../shared/domain';
import { KpiCard } from '../../shared/layout/KpiCard';
import { PageHeader } from '../../shared/layout/PageHeader';
import {
  Button,
  Empty,
  EntityLink,
  HoverRow,
  Info,
  money,
  currencyLabel,
  TableShell,
  useToast,
} from '../../shared/ui';
import { RecordGrossProfitModal } from './RecordGrossProfitModal';
import { useProfitability } from './useProfitability';

export function ProfitabilityPage() {
  const { query, isMutating, setFxAvailable, retryUsd, recordManualGrossProfit } = useProfitability();
  const { pushToast } = useToast();
  const [recording, setRecording] = useState<ProfitabilityInvoiceRow | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  if (query.status === 'loading') {
    return (
      <p className="text-sm text-navy-400" aria-live="polite">
        Cargando rentabilidad…
      </p>
    );
  }

  if (query.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar la rentabilidad">
        {query.error.message}
      </Info>
    );
  }

  const { snapshot } = query;

  async function handleToggleFx() {
    const response = await setFxAvailable(!snapshot.fxAvailable);
    if (!response.ok) {
      pushToast(response.error.message, 'error');
      return;
    }
    pushToast(
      snapshot.fxAvailable
        ? 'Tasa de cambio desactivada. Los resultados ya calculados no cambian.'
        : 'Tasa de cambio activada. Reintente las facturas pendientes.',
      'success',
    );
  }

  async function handleRetry(invoiceId: string) {
    const response = await retryUsd({ invoiceId });
    if (!response.ok) {
      pushToast(response.error.message, 'error');
      return;
    }
    pushToast('Cálculo de rentabilidad reintentado', 'success');
  }

  async function handleRecord(input: { profitDop: number }) {
    if (!recording) {
      return;
    }
    const response = await recordManualGrossProfit({
      invoiceId: recording.id,
      profitDop: input.profitDop,
    });
    if (!response.ok) {
      setRecordError(response.error.message);
      return;
    }
    setRecording(null);
    setRecordError(null);
    pushToast('Ganancia bruta registrada', 'success');
  }

  return (
    <>
      <PageHeader
        title="Rentabilidad"
        description="Ganancia bruta en pesos: precio de venta menos costo de adquisición. Si el costo es desconocido, el administrador puede registrar la ganancia según su criterio. En facturas en dólares, la tasa convierte esa ganancia a pesos para sumarla al total. Visible solo para administrador. La tasa de cambio no bloquea la venta."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FxStatusChip available={snapshot.fxAvailable} />
            <Button variant="secondary" size="sm" onClick={() => void handleToggleFx()} disabled={isMutating}>
              {snapshot.fxAvailable ? 'Desactivar tasa de cambio (demo)' : 'Activar tasa de cambio (demo)'}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            label="Ganancia bruta en pesos"
            value={money(snapshot.profitDop, 'DOP')}
            hint="Incluye facturas en dólares convertidas con su tasa y ganancias registradas a criterio"
            tone="brand"
          />
          <KpiCard
            label="Pendientes de tasa de cambio"
            value={new Intl.NumberFormat('es-DO').format(snapshot.pendingFxCount)}
            hint="Facturas en dólares sin tasa al confirmar"
            tone={snapshot.pendingFxCount > 0 ? 'amber' : 'default'}
          />
          <KpiCard
            label="Tasa de demostración"
            value={snapshot.fxRateDopPerUsd.toFixed(2)}
            hint="Pesos por cada dólar"
          />
        </div>

        {snapshot.invoices.length === 0 ? (
          <Empty
            title="No hay facturas con rentabilidad"
            description="Las facturas completadas aparecerán aquí cuando exista ganancia calculada o pendiente."
          />
        ) : (
          <TableShell>
            <thead className="border-b border-navy-100 bg-navy-50 text-navy-400">
              <tr>
                <th className="px-4 py-3 font-medium">Factura</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Moneda</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Ganancia bruta</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {snapshot.invoices.map((row) => (
                <HoverRow key={row.id} to={row.href}>
                  <td className="px-4 py-3 font-medium text-navy">
                    <EntityLink to={row.href}>{row.number}</EntityLink>
                  </td>
                  <td className="px-4 py-3 text-navy-700">{row.customerName}</td>
                  <td className="px-4 py-3">{currencyLabel(row.currency)}</td>
                  <td className="px-4 py-3 font-mono">{money(row.total, row.currency)}</td>
                  <td className="px-4 py-3">
                    {row.pendingFx ? (
                      <span className="text-amber-800">Pendiente de tasa de cambio</span>
                    ) : row.profit == null ? (
                      <span className="text-navy-400">No disponible</span>
                    ) : (
                      <span className="font-mono">
                        {money(row.profit, 'DOP')}
                        {row.source === 'MANUAL' ? (
                          <span className="ml-2 text-xs font-sans text-navy-400">criterio admin</span>
                        ) : null}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.pendingFx ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isMutating}
                        onClick={() => void handleRetry(row.id)}
                      >
                        Reintentar
                      </Button>
                    ) : row.canRecordManual ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isMutating}
                        onClick={() => {
                          setRecordError(null);
                          setRecording(row);
                        }}
                      >
                        {row.profit == null ? 'Registrar ganancia' : 'Editar ganancia'}
                      </Button>
                    ) : (
                      <span className="text-navy-400">—</span>
                    )}
                  </td>
                </HoverRow>
              ))}
            </tbody>
          </TableShell>
        )}
      </div>

      <RecordGrossProfitModal
        open={recording != null}
        invoiceNumber={recording?.number ?? ''}
        initialProfitDop={recording?.source === 'MANUAL' ? recording.profit : null}
        isSaving={isMutating}
        error={recordError}
        onClose={() => {
          setRecording(null);
          setRecordError(null);
        }}
        onSubmit={(input) => void handleRecord(input)}
      />
    </>
  );
}
