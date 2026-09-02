import type {
  AbandonedReservationRow,
  PendingFxRecoveryRow,
  RecoverySnapshot,
} from '../../api/contracts/recovery';
import { ABANDONED_DRAFT_AFTER_HOURS } from '../../api/contracts/recovery';
import type { AppState } from '../../api/contracts/entities';
import { isAbandonedDraft } from './recovery-eligibility';

const QUICK_LINKS = [
  {
    id: 'work-orders',
    label: 'Órdenes de trabajo',
    href: '/work-orders',
    description: 'Reasignar, liberar o cancelar órdenes de trabajo elegibles',
  },
  {
    id: 'inventory',
    label: 'Inventario',
    href: '/inventory',
    description: 'Revisar piezas reservadas o vendidas',
  },
  {
    id: 'sales',
    label: 'Facturas',
    href: '/sales',
    description: 'Pagos, cancelación y corrección de moneda',
  },
  {
    id: 'profitability',
    label: 'Rentabilidad',
    href: '/profitability',
    description:
      'Activar o desactivar la tasa de cambio de demostración y ver el detalle por factura',
  },
] as const;

export function buildRecoverySnapshot(state: AppState): RecoverySnapshot {
  const abandonedReservations: AbandonedReservationRow[] = state.invoices
    .filter((invoice) => isAbandonedDraft(invoice))
    .map((draft) => {
      const reservedItems = state.items.filter((item) => item.reservedByDraftId === draft.id);
      const reservedQty = draft.lines
        .filter((line) => line.qtyProductId)
        .map((line) => line.qtyProductId!)
        .filter((id, index, ids) => ids.indexOf(id) === index);

      return {
        draftId: draft.id,
        customerName:
          state.customers.find((customer) => customer.id === draft.customerId)?.name ??
          draft.customerId,
        createdAt: draft.createdAt,
        reservedItemIds: reservedItems.map((item) => item.id),
        reservedQtyProductIds: reservedQty,
        href: `/sales/draft/${draft.id}`,
      };
    })
    .filter((row) => row.reservedItemIds.length > 0 || row.reservedQtyProductIds.length > 0)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  const pendingFx: PendingFxRecoveryRow[] = state.invoices
    .filter((invoice) => invoice.profitabilityPendingFx === true && invoice.number)
    .map((invoice) => ({
      invoiceId: invoice.id,
      number: invoice.number!,
      currency: invoice.currency,
      href: `/sales/${invoice.id}`,
    }))
    .sort((left, right) => left.number.localeCompare(right.number, 'es'));

  return {
    abandonedReservations,
    pendingFx,
    diagnostics: [
      {
        id: 'stuck-reservations',
        label: 'Reservas abandonadas',
        count: abandonedReservations.length,
        hint: `Borradores reservados con al menos ${ABANDONED_DRAFT_AFTER_HOURS} horas; no se liberan automáticamente.`,
      },
      {
        id: 'pending-fx',
        label: 'Rentabilidad en dólares pendiente de tasa de cambio',
        count: pendingFx.length,
        hint: 'Activar la tasa de cambio y reintentar. No reabre la venta.',
      },
      {
        id: 'wo-in-progress',
        label: 'Órdenes de trabajo en proceso',
        count: state.workOrders.filter((order) => order.status === 'IN_PROGRESS').length,
        hint: 'Reasignar o cancelar desde Órdenes de trabajo.',
      },
    ],
    quickLinks: [...QUICK_LINKS],
  };
}
