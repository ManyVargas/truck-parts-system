import type { InvoiceProfitabilityView } from '../../api/contracts/sales';
import { Card, Info, money, SectionTitle } from '../../shared/ui';

export function ProfitabilityPanel({ view }: { view: InvoiceProfitabilityView }) {
  return (
    <section>
      <SectionTitle title="Rentabilidad" subtitle="Visible solo para administrador" />
      <Card>
        {view.pendingFx || view.profit == null ? (
          <Info
            tone="warning"
            title={view.pendingFx ? 'Rentabilidad pendiente de tasa de cambio' : 'Rentabilidad no disponible'}
          >
            {view.reason ?? 'No hay un cálculo de ganancia bruta para este documento.'}
          </Info>
        ) : (
          <div>
            <p className="text-2xl font-semibold text-navy">{money(view.profit, 'DOP')}</p>
            {view.source === 'MANUAL' && (
              <p className="mt-2 text-xs text-navy-400">
                Registrada por el administrador porque el costo no permitía calcularla.
              </p>
            )}
            {view.rateDopPerUsd != null && (
              <p className="mt-2 text-xs text-navy-400">
                Equivalente en pesos de la ganancia en dólares · tasa {view.rateDopPerUsd.toFixed(2)}{' '}
                pesos por dólar
                {view.rateSource
                  ? ` · ${view.rateSource === 'DEMO_FX' ? 'tasa de demostración' : view.rateSource}`
                  : ''}
              </p>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}
