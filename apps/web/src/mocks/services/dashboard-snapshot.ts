import type {
  ActivityRow,
  DashboardKpis,
  DashboardSnapshot,
  RecentInvoiceRow,
} from '../../api/contracts/dashboard';
import type { AppState } from '../../api/contracts/entities';
import { DEMO_NOW_ISO } from '../data/demo-clock';
import { invoiceProfitDop } from './gross-profit';
import { isComplete } from './inventory-helpers';
import { invoiceBalance, invoiceTotal, utcCalendarDate } from './invoice-money';

const RECENT_INVOICE_LIMIT = 5;
const ACTIVITY_LIMIT = 8;

export type BuildDashboardSnapshotOptions = {
  nowIso?: string;
  includeProfitability: boolean;
};

function availableInventoryCount(state: AppState): number {
  const individual = state.items.filter((item) => item.commercialState === 'AVAILABLE').length;
  const quantityUnits = state.qtyProducts.reduce(
    (sum, product) => sum + (product.onHand - product.reserved),
    0,
  );
  return individual + quantityUnits;
}

function invoicesConfirmedOn(state: AppState, day: string): number {
  return state.invoices.filter(
    (invoice) =>
      invoice.status === 'COMPLETED' &&
      invoice.confirmedAt != null &&
      utcCalendarDate(invoice.confirmedAt) === day,
  ).length;
}

function outstandingByCurrency(state: AppState): { dop: number; usd: number } {
  let dop = 0;
  let usd = 0;

  for (const invoice of state.invoices) {
    const balance = invoiceBalance(invoice);
    if (balance <= 0) {
      continue;
    }
    if (invoice.currency === 'USD') {
      usd += balance;
    } else {
      dop += balance;
    }
  }

  return { dop, usd };
}

function profitDopTotal(state: AppState): number {
  let total = 0;

  for (const invoice of state.invoices) {
    const profit = invoiceProfitDop(invoice, state);
    if (profit == null) {
      continue;
    }
    total += profit;
  }

  return total;
}

function incompleteAssemblyCount(state: AppState): number {
  return state.items.filter(
    (item) => isComplete(item, state.knownMissing, state.categories) === false,
  ).length;
}

function toRecentInvoice(state: AppState, invoiceId: string): RecentInvoiceRow | null {
  const invoice = state.invoices.find((entry) => entry.id === invoiceId);
  if (!invoice || invoice.status !== 'COMPLETED') {
    return null;
  }

  const customer = state.customers.find((entry) => entry.id === invoice.customerId);

  return {
    id: invoice.id,
    number: invoice.number ?? invoice.id,
    customerName: customer?.name ?? invoice.customerId,
    status: invoice.status,
    paymentState: invoice.paymentState,
    currency: invoice.currency,
    total: invoiceTotal(invoice),
    balance: invoiceBalance(invoice),
    confirmedAt: invoice.confirmedAt,
  };
}

/**
 * Pure aggregation over mock state — UI must not recompute these rules.
 */
export function buildDashboardSnapshot(
  state: AppState,
  options: BuildDashboardSnapshotOptions,
): DashboardSnapshot {
  const nowIso = options.nowIso ?? DEMO_NOW_ISO;
  const today = utcCalendarDate(nowIso);
  const outstanding = outstandingByCurrency(state);

  const kpis: DashboardKpis = {
    availableInventory: availableInventoryCount(state),
    invoicesToday: invoicesConfirmedOn(state, today),
    outstandingDop: outstanding.dop,
    outstandingUsd: outstanding.usd,
    draftCount: state.invoices.filter((invoice) => invoice.status === 'DRAFT').length,
    pendingDismantling: state.workOrders.filter(
      (order) => order.type === 'DISMANTLING' && order.status === 'PENDING',
    ).length,
    workOrdersInProgress: state.workOrders.filter((order) => order.status === 'IN_PROGRESS').length,
    incompleteAssemblies: incompleteAssemblyCount(state),
  };

  if (options.includeProfitability) {
    kpis.profitDop = profitDopTotal(state);
    kpis.pendingFx = state.invoices.filter((invoice) => invoice.profitabilityPendingFx).length;
  }

  const recentInvoices = [...state.invoices]
    .filter((invoice) => invoice.status === 'COMPLETED')
    .sort((left, right) => (right.confirmedAt ?? '').localeCompare(left.confirmedAt ?? ''))
    .slice(0, RECENT_INVOICE_LIMIT)
    .map((invoice) => toRecentInvoice(state, invoice.id))
    .filter((row): row is RecentInvoiceRow => row != null);

  const activity: ActivityRow[] = [...state.events]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, ACTIVITY_LIMIT)
    .map((event) => ({
      id: event.id,
      type: event.type,
      description: event.description,
      createdAt: event.createdAt,
    }));

  return { kpis, recentInvoices, activity, demoNowIso: nowIso };
}
