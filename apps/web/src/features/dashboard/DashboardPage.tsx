import type { DashboardKpis } from '../../api/contracts/dashboard';
import { KpiCard } from '../../shared/layout/KpiCard';
import { Info, money } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';
import { ActivityTimeline } from './ActivityTimeline';
import { RecentInvoicesList } from './RecentInvoicesList';
import { useDashboard } from './useDashboard';

function formatCount(value: number): string {
  return new Intl.NumberFormat('es-DO').format(value);
}

function PrimaryKpiRow({ kpis }: { kpis: DashboardKpis }) {
  const fourth =
    kpis.profitDop != null
      ? {
          label: 'Utilidad DOP',
          value: money(kpis.profitDop, 'DOP'),
          hint: 'Solo administrador · costo desconocido excluido',
          tone: 'brand' as const,
        }
      : {
          label: 'Borradores',
          value: formatCount(kpis.draftCount),
          hint: 'Ventas sin confirmar',
          tone: 'default' as const,
        };

  const outstandingHint =
    kpis.outstandingUsd > 0
      ? `USD pendiente: ${money(kpis.outstandingUsd, 'USD')}`
      : 'Facturas completadas sin saldar';

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Inventario disponible"
        value={formatCount(kpis.availableInventory)}
        hint="Piezas disponibles + unidades de cantidad libres"
      />
      <KpiCard
        label="Facturas hoy"
        value={formatCount(kpis.invoicesToday)}
        hint="Confirmadas en el reloj demo"
      />
      <KpiCard
        label="Saldo pendiente"
        value={money(kpis.outstandingDop, 'DOP')}
        hint={outstandingHint}
        tone={kpis.outstandingDop > 0 ? 'amber' : 'default'}
      />
      <KpiCard {...fourth} />
    </div>
  );
}

function SecondaryKpiRow({ kpis }: { kpis: DashboardKpis }) {
  const cards = [
    {
      label: 'Desarmes pendientes',
      value: formatCount(kpis.pendingDismantling),
      hint: 'OT de desarme sin asignar',
    },
    {
      label: 'Orden de Trabajo en proceso',
      value: formatCount(kpis.workOrdersInProgress),
      hint: 'Cualquier tipo de orden activa',
    },
    {
      label: 'Ensamblajes incompletos',
      value: formatCount(kpis.incompleteAssemblies),
      hint: 'Padres con faltantes o baseline incompleto',
    },
  ];

  if (kpis.pendingFx != null) {
    cards.push({
      label: 'FX pendiente',
      value: formatCount(kpis.pendingFx),
      hint: 'Rentabilidad USD sin tasa',
    });
  }

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${kpis.pendingFx != null ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}

export function DashboardPage() {
  const query = useDashboard();

  if (query.status === 'loading') {
    return (
      <p className="text-sm text-navy-400" aria-live="polite">
        Cargando dashboard…
      </p>
    );
  }

  if (query.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar el dashboard">
        {query.error.message}
      </Info>
    );
  }

  const { snapshot } = query;
  const isAdmin = snapshot.kpis.profitDop != null;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          isAdmin
            ? 'Resumen operativo y comercial del inventario, ventas y órdenes.'
            : 'Resumen operativo de inventario, ventas y borradores.'
        }
      />

      <div className="space-y-6">
        <PrimaryKpiRow kpis={snapshot.kpis} />
        <SecondaryKpiRow kpis={snapshot.kpis} />

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <RecentInvoicesList invoices={snapshot.recentInvoices} />
          </div>
          <div className="lg:col-span-2">
            <ActivityTimeline events={snapshot.activity} />
          </div>
        </div>
      </div>
    </>
  );
}
