import type {
  ProfitabilityInvoiceRow,
  ProfitabilitySnapshot,
} from '../../api/contracts/profitability';
import type { AppState, Invoice, User } from '../../api/contracts/entities';
import { can } from '../../shared/auth/policies';
import { invoiceTotal, roundMoney } from './invoice-money';
import { canRecordManualGrossProfit, profitabilityForInvoice } from './profitability-view';

function customerName(state: AppState, invoice: Invoice): string {
  return (
    invoice.customerSnapshot?.name ??
    state.customers.find((entry) => entry.id === invoice.customerId)?.name ??
    invoice.customerId
  );
}

function toRow(state: AppState, invoice: Invoice, actor: User): ProfitabilityInvoiceRow | null {
  if (invoice.status !== 'COMPLETED') {
    return null;
  }

  const view = profitabilityForInvoice(state, invoice, actor);
  if (!view) {
    return null;
  }

  return {
    id: invoice.id,
    number: invoice.number ?? invoice.id,
    customerName: customerName(state, invoice),
    currency: invoice.currency,
    total: invoiceTotal(invoice),
    profit: view.profit,
    pendingFx: view.pendingFx,
    source: view.source,
    canRecordManual: canRecordManualGrossProfit(invoice, state),
    reason: view.reason,
    rateDopPerUsd: view.rateDopPerUsd,
    href: `/sales/${invoice.id}`,
  };
}

export function buildProfitabilitySnapshot(
  state: AppState,
  actor: User,
): ProfitabilitySnapshot | undefined {
  if (!can(actor, 'profit.view')) {
    return undefined;
  }

  const invoices = [...state.invoices]
    .map((invoice) => toRow(state, invoice, actor))
    .filter((row): row is ProfitabilityInvoiceRow => row != null)
    .sort((left, right) => left.number.localeCompare(right.number, 'es'));

  return {
    fxAvailable: state.fxAvailable,
    fxRateDopPerUsd: state.fxRateDopPerUsd,
    profitDop: roundMoney(
      invoices
        .filter((row) => row.profit != null && !row.pendingFx)
        .reduce((sum, row) => sum + (row.profit ?? 0), 0),
    ),
    pendingFxCount: invoices.filter((row) => row.pendingFx).length,
    invoices,
  };
}
