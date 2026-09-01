import { Link } from 'react-router-dom';

import type { CatalogReviewAlert, DashboardKpis } from '../../api/contracts/dashboard';
import { KpiCard } from '../../shared/layout/KpiCard';
import { Info, money } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';
import { ActivityTimeline } from './ActivityTimeline';
import { RecentInvoicesList } from './RecentInvoicesList';
import { useDashboard } from './useDashboard';

function formatCount(value: number): string {
  return new Intl.NumberFormat('es-DO').format(value);
}

function CatalogReviewBanner({ reviews }: { reviews: CatalogReviewAlert[] }) {
  return (
    <Info tone="warning" title="Catálogo: ensamblajes afectados por un componente nuevo">
      <ul className="mt-1 list-disc space-y-1 pl-4">
        {reviews.map((review) => (
          <li key={`${review.itemId}-${review.expectedComponentName}-${review.kind}`}>
            <Link to={`/inventory/${review.itemId}`} className="font-medium underline">
              {review.itemName} ({review.itemId})
            </Link>
            {review.kind === 'ALREADY_PRESENT' ? (
              <>
                {' '}
                ya tenía {review.expectedComponentName}
                {review.matchedChildId
                  ? ` (${review.matchedChildName ?? review.matchedChildId})`
                  : ''}{' '}
                en el árbol. Revise el ensamblaje si hace falta.
              </>
            ) : (
              <>
                {' '}
                ya estaba registrado y ahora {review.categoryName.toLowerCase()} espera{' '}
                {review.expectedComponentName}. Sigue completo con NA provisional hasta confirmar
                NA, registrar la pieza presente o marcar falta.
              </>
            )}
          </li>
        ))}
      </ul>
    </Info>
  );
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
  const cards: {
    label: string;
    value: string;
    hint: string;
    tone?: 'default' | 'amber' | 'brand';
  }[] = [
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

  if (kpis.pendingCatalogValidations != null) {
    cards.push({
      label: 'Componentes por validar',
      value: formatCount(kpis.pendingCatalogValidations),
      hint: 'Esperados nuevos aún en NA provisional',
      tone: kpis.pendingCatalogValidations > 0 ? ('amber' as const) : ('default' as const),
    });
  }

  if (kpis.pendingFx != null) {
    cards.push({
      label: 'FX pendiente',
      value: formatCount(kpis.pendingFx),
      hint: 'Rentabilidad USD sin tasa',
      tone: 'default' as const,
    });
  }

  const columns =
    cards.length >= 4 ? 'xl:grid-cols-4' : cards.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-2';

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${columns}`}>
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
        {snapshot.pendingCatalogReviews && snapshot.pendingCatalogReviews.length > 0 && (
          <CatalogReviewBanner reviews={snapshot.pendingCatalogReviews} />
        )}
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
