import type { InvoiceProfitabilityView } from '../../api/contracts/sales';
import { Card, Info, money, SectionTitle } from '../../shared/ui';

export function ProfitabilityPanel({ view }: { view: InvoiceProfitabilityView }) {
  return (
    <section>
      <SectionTitle title="Rentabilidad" subtitle="Visible solo para administrador" />
      <Card>
        {view.pendingFx || view.profit == null ? (
          <Info tone="warning" title={view.pendingFx ? 'Rentabilidad pendiente de tasa FX' : 'Rentabilidad no disponible'}>
            {view.reason ?? 'No hay un cálculo de utilidad para este documento.'}
          </Info>
        ) : (
          <p className="text-2xl font-semibold text-navy">{money(view.profit, view.currency)}</p>
        )}
      </Card>
    </section>
  );
}
