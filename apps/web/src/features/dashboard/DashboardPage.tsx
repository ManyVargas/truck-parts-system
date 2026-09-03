import { Link } from 'react-router-dom';

import type { CatalogReviewAlert, DashboardKpis } from '../../api/contracts/dashboard';
import type { AppCapabilities } from '../../shared/config/capabilities';
import { useAppCapabilities } from '../../shared/config/CapabilitiesProvider';
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
                {review.expectedComponentName}. Sigue completo con “no aplica” provisional hasta
                confirmar que no aplica, registrar la pieza presente o marcar falta.
              </>
            )}
          </li>
        ))}
      </ul>
    </Info>
  );
}

function PrimaryKpiRow({ kpis, capabilities }: { kpis: DashboardKpis; capabilities: AppCapabilities }) {
  const cards: {
    label: string;
    value: string;
    hint: string;
    tone?: 'default' | 'amber' | 'brand';
  }[] = [];

  if (capabilities.inventory) {
    cards.push({
      label: 'Inventario disponible',
      value: formatCount(kpis.availableInventory),
      hint: 'Piezas disponibles + unidades de cantidad libres',
    });
  }

  if (capabilities.sales) {
    cards.push({
      label: 'Facturas hoy',
      value: formatCount(kpis.invoicesToday),
      hint: 'Confirmadas en el reloj demo',
    });
  }

  if (capabilities.payments) {
    cards.push({
      label: 'Saldo pendiente',
      value: money(kpis.outstandingDop, 'DOP'),
      hint:
        kpis.outstandingUsd > 0
          ? `Dólares pendientes: ${money(kpis.outstandingUsd, 'USD')}`
          : 'Facturas completadas sin saldar',
      tone: kpis.outstandingDop > 0 ? 'amber' : 'default',
    });
  }

  if (capabilities.profitability && kpis.profitDop != null) {
    cards.push({
      label: 'Ganancia bruta en pesos',
      value: money(kpis.profitDop, 'DOP'),
      hint: 'Solo administrador · dólares convertidos a pesos con su tasa',
      tone: 'brand',
    });
  } else if (capabilities.sales) {
    cards.push({
      label: 'Borradores',
      value: formatCount(kpis.draftCount),
      hint: 'Ventas sin confirmar',
    });
  }

  if (cards.length === 0) {
    return null;
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

function SecondaryKpiRow({ kpis, capabilities }: { kpis: DashboardKpis; capabilities: AppCapabilities }) {
  const cards: {
    label: string;
    value: string;
    hint: string;
    tone?: 'default' | 'amber' | 'brand';
  }[] = [];

  if (capabilities.workOrders) {
    cards.push(
      {
        label: 'Desarmes pendientes',
        value: formatCount(kpis.pendingDismantling),
        hint: 'Órdenes de desarme sin asignar',
      },
      {
        label: 'Orden de Trabajo en proceso',
        value: formatCount(kpis.workOrdersInProgress),
        hint: 'Cualquier tipo de orden activa',
      },
    );
  }

  if (capabilities.hierarchy) {
    cards.push({
      label: 'Ensamblajes incompletos',
      value: formatCount(kpis.incompleteAssemblies),
      hint: 'Padres con faltantes o baseline incompleto',
    });
  }

  if (capabilities.hierarchy && kpis.pendingCatalogValidations != null) {
    cards.push({
      label: 'Componentes por validar',
      value: formatCount(kpis.pendingCatalogValidations),
      hint: 'Componentes esperados aún en “no aplica” provisional',
      tone: kpis.pendingCatalogValidations > 0 ? 'amber' : 'default',
    });
  }

  if (capabilities.profitability && kpis.pendingFx != null) {
    cards.push({
      label: 'Tasa de cambio pendiente',
      value: formatCount(kpis.pendingFx),
      hint: 'Rentabilidad en dólares sin tasa de cambio',
    });
  }

  if (cards.length === 0) {
    return null;
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
  const capabilities = useAppCapabilities();

  if (query.status === 'loading') {
    return (
      <p className="text-sm text-navy-400" aria-live="polite">
        Cargando inicio…
      </p>
    );
  }

  if (query.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar el inicio">
        {query.error.message}
      </Info>
    );
  }

  const { snapshot } = query;
  const isAdmin = snapshot.kpis.profitDop != null;

  return (
    <>
      <PageHeader
        title="Inicio"
        description={
          isAdmin
            ? 'Resumen operativo y comercial del inventario, ventas y órdenes.'
            : 'Resumen operativo de inventario, ventas y borradores.'
        }
      />

      <div className="space-y-6">
        {capabilities.hierarchy &&
          snapshot.pendingCatalogReviews &&
          snapshot.pendingCatalogReviews.length > 0 && (
          <CatalogReviewBanner reviews={snapshot.pendingCatalogReviews} />
        )}
        <PrimaryKpiRow kpis={snapshot.kpis} capabilities={capabilities} />
        <SecondaryKpiRow kpis={snapshot.kpis} capabilities={capabilities} />

        <div className="grid gap-8 lg:grid-cols-5">
          {capabilities.sales && (
            <div className="lg:col-span-3">
              <RecentInvoicesList invoices={snapshot.recentInvoices} />
            </div>
          )}
          <div className={capabilities.sales ? 'lg:col-span-2' : 'lg:col-span-5'}>
            <ActivityTimeline events={snapshot.activity} />
          </div>
        </div>
      </div>
    </>
  );
}
