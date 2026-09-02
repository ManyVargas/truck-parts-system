import type { AppState, Invoice, User } from '../../api/contracts/entities';
import type {
  InvoiceDetailView,
  InvoiceLineView,
  SalesListRow,
  SalesListTab,
} from '../../api/contracts/sales';
import { can } from '../../shared/auth/policies';
import {
  invoiceBalance,
  invoicePaid,
  invoiceRefunded,
  invoiceTotal,
  lineBase,
  lineGross,
  lineItbis,
} from './invoice-money';
import { profitabilityForInvoice } from './profitability-view';

function customerName(state: AppState, invoice: Invoice): string {
  return (
    invoice.customerSnapshot?.name ??
    state.customers.find((entry) => entry.id === invoice.customerId)?.name ??
    invoice.customerId
  );
}

function draftHref(invoice: Invoice): string {
  return invoice.status === 'DRAFT' ? `/sales/draft/${invoice.id}` : `/sales/${invoice.id}`;
}

function displayNumber(invoice: Invoice): string {
  if (invoice.number) {
    return invoice.number;
  }
  return invoice.status === 'DRAFT' ? `Borrador ${invoice.id}` : invoice.id;
}

export function toSalesListRow(state: AppState, invoice: Invoice): SalesListRow {
  return {
    id: invoice.id,
    number: displayNumber(invoice),
    status: invoice.status,
    paymentState: invoice.paymentState,
    customerId: invoice.customerId,
    customerName: customerName(state, invoice),
    currency: invoice.currency,
    fiscal: invoice.fiscal,
    total: invoiceTotal(invoice),
    balance: invoiceBalance(invoice),
    createdAt: invoice.createdAt,
    confirmedAt: invoice.confirmedAt,
    href: draftHref(invoice),
  };
}

export function matchesSalesTab(invoice: Invoice, tab: SalesListTab): boolean {
  if (tab === 'ALL') {
    return true;
  }
  return invoice.status === tab;
}

export function buildSalesList(state: AppState, tab: SalesListTab = 'ALL'): SalesListRow[] {
  return [...state.invoices]
    .filter((invoice) => matchesSalesTab(invoice, tab))
    .sort((left, right) => {
      const leftKey = left.confirmedAt ?? left.createdAt;
      const rightKey = right.confirmedAt ?? right.createdAt;
      return rightKey.localeCompare(leftKey);
    })
    .map((invoice) => toSalesListRow(state, invoice));
}

function toLineView(line: Invoice['lines'][number], fiscal: boolean): InvoiceLineView {
  return {
    id: line.id,
    type: line.type,
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    taxable: line.taxable,
    gross: lineGross(line),
    base: lineBase(line, fiscal),
    itbis: lineItbis(line, fiscal),
  };
}

function isLinkedInvoiceEvent(event: AppState['events'][number], invoice: Invoice): boolean {
  if (event.metadata?.invoiceId === invoice.id) {
    return true;
  }
  if (invoice.number && event.description.includes(invoice.number)) {
    return true;
  }
  return event.description.includes(invoice.id);
}

export function buildInvoiceDetail(state: AppState, invoice: Invoice, actor: User): InvoiceDetailView {
  const customer = state.customers.find((entry) => entry.id === invoice.customerId);
  const completed = invoice.status === 'COMPLETED';
  const numbered = invoice.status === 'COMPLETED' || invoice.status === 'CANCELLED';

  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    paymentState: invoice.paymentState,
    customerId: invoice.customerId,
    customerName: invoice.customerSnapshot?.name ?? customer?.name ?? invoice.customerId,
    customerRnc: invoice.customerSnapshot?.rnc ?? customer?.rnc,
    currency: invoice.currency,
    fiscal: invoice.fiscal,
    lines: invoice.lines.map((line) => toLineView(line, invoice.fiscal)),
    payments: invoice.payments.map((payment) => ({
      id: payment.id,
      kind: payment.kind === 'REFUND' ? 'REFUND' : 'PAYMENT',
      amount: payment.amount,
      method: payment.method,
      createdAt: payment.createdAt,
      reference: payment.reference,
    })),
    total: invoiceTotal(invoice),
    paid: invoicePaid(invoice),
    refunded: invoiceRefunded(invoice),
    balance: invoiceBalance(invoice),
    createdAt: invoice.createdAt,
    confirmedAt: invoice.confirmedAt,
    cancelledAt: invoice.cancelledAt,
    cancelReason: invoice.cancelReason,
    linkedWorkOrders: state.workOrders
      .filter(
        (order) =>
          order.invoiceId === invoice.id || Boolean(order.linkedInvoiceIds?.includes(invoice.id)),
      )
      .map((order) => ({
        id: order.id,
        type: order.type,
        status: order.status,
        pieceId: order.pieceId,
        pieceName: state.items.find((item) => item.id === order.pieceId)?.name ?? order.pieceId,
      })),
    history: state.events
      .filter((event) => isLinkedInvoiceEvent(event, invoice))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((event) => ({
        id: event.id,
        type: event.type,
        description: event.description,
        createdAt: event.createdAt,
        actorName: state.users.find((user) => user.id === event.actorId)?.name,
      })),
    profitability: profitabilityForInvoice(state, invoice, actor),
    actions: {
      canPay: completed && can(actor, 'sales.manage') && invoiceBalance(invoice) > 0,
      canCancel: completed && can(actor, 'sales.cancel'),
      canCorrectCurrency: completed && can(actor, 'sales.correctCurrency') && invoice.payments.length === 0 && invoice.paymentState !== 'PAID',
      canViewPdf: numbered && Boolean(invoice.number),
    },
    deliveredAssemblies: invoice.deliveredAssemblies,
  };
}
