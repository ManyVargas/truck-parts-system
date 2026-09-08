import type { InvoiceLine } from '@prisma/client';

import { MONEY_DECIMAL_PLACES } from './money/constants.js';
import { calculateLineMoney, isTaxableLineType, sumInvoiceMoney } from './money/index.js';
import type {
  InvoiceConfirmedHistorySnapshot,
  InvoiceCustomerSnapshot,
  InvoiceDraftHistorySnapshot,
  InvoiceLineHistorySnapshot,
  InvoiceListRecord,
  InvoiceRecord,
  PublicInvoice,
  PublicInvoiceLine,
  PublicInvoiceListItem,
} from './types.js';

function moneyString(value: { toFixed(places: number): string }): string {
  return value.toFixed(MONEY_DECIMAL_PLACES);
}

function customerSnapshotOf(
  invoice: InvoiceRecord | InvoiceListRecord,
): InvoiceCustomerSnapshot | null {
  if (invoice.status === 'DRAFT' || invoice.customerName == null) return null;
  return { name: invoice.customerName, rnc: invoice.customerRnc };
}

function toCustomerView(invoice: InvoiceRecord | InvoiceListRecord) {
  const snapshot = customerSnapshotOf(invoice);
  return {
    id: invoice.customer.id,
    name: snapshot?.name ?? invoice.customer.name,
    rnc: snapshot ? snapshot.rnc : invoice.customer.rnc,
    isDefault: invoice.customer.isDefault,
  };
}

function persistedLineMoney(line: InvoiceLine) {
  if (line.gross == null || line.base == null || line.itbis == null) return null;
  return { gross: line.gross, base: line.base, itbis: line.itbis };
}

function toPublicLine(line: InvoiceLine, fiscal: boolean): PublicInvoiceLine {
  const money =
    persistedLineMoney(line) ??
    calculateLineMoney({
      type: line.type,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      fiscal,
    });
  return {
    id: line.id,
    type: line.type,
    description: line.description,
    quantity: moneyString(line.quantity),
    unitPrice: moneyString(line.unitPrice),
    taxable: isTaxableLineType(line.type),
    gross: moneyString(money.gross),
    base: moneyString(money.base),
    itbis: moneyString(money.itbis),
    acquisitionCostDop: line.acquisitionCostDop == null ? null : moneyString(line.acquisitionCostDop),
    costProvenance: line.costProvenance,
    serviceId: line.serviceId,
  };
}

function invoiceTotals(invoice: InvoiceRecord) {
  if (invoice.gross != null && invoice.base != null && invoice.itbis != null) {
    return {
      gross: moneyString(invoice.gross),
      base: moneyString(invoice.base),
      itbis: moneyString(invoice.itbis),
    };
  }
  const totals = sumInvoiceMoney(
    invoice.lines.map((line) =>
      calculateLineMoney({
        type: line.type,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        fiscal: invoice.fiscal,
      }),
    ),
  );
  return {
    gross: moneyString(totals.gross),
    base: moneyString(totals.base),
    itbis: moneyString(totals.itbis),
  };
}

export function toPublicInvoice(invoice: InvoiceRecord): PublicInvoice {
  return {
    id: invoice.id,
    status: invoice.status,
    number: invoice.number,
    currency: invoice.currency,
    fiscal: invoice.fiscal,
    customer: toCustomerView(invoice),
    customerSnapshot: customerSnapshotOf(invoice),
    confirmedAt: invoice.confirmedAt?.toISOString() ?? null,
    lines: invoice.lines.map((line) => toPublicLine(line, invoice.fiscal)),
    totals: invoiceTotals(invoice),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export function toPublicInvoiceListItem(invoice: InvoiceListRecord): PublicInvoiceListItem {
  return {
    id: invoice.id,
    status: invoice.status,
    number: invoice.number,
    currency: invoice.currency,
    fiscal: invoice.fiscal,
    customer: toCustomerView(invoice),
    customerSnapshot: customerSnapshotOf(invoice),
    confirmedAt: invoice.confirmedAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export function toDraftHistorySnapshot(invoice: {
  currency: InvoiceRecord['currency'];
  fiscal: boolean;
  customerId: string;
}): InvoiceDraftHistorySnapshot {
  return {
    status: 'DRAFT',
    number: null,
    currency: invoice.currency,
    fiscal: invoice.fiscal,
    customerId: invoice.customerId,
  };
}

export function toConfirmedHistorySnapshot(invoice: InvoiceRecord): InvoiceConfirmedHistorySnapshot {
  const snapshot = customerSnapshotOf(invoice);
  if (invoice.number == null || invoice.confirmedAt == null || snapshot == null) {
    throw new Error('Confirmed invoice is missing snapshot fields');
  }
  return {
    status: 'COMPLETED',
    number: invoice.number,
    currency: invoice.currency,
    fiscal: invoice.fiscal,
    customerId: invoice.customerId,
    customerSnapshot: snapshot,
    totals: invoiceTotals(invoice),
    confirmedAt: invoice.confirmedAt.toISOString(),
  };
}

export function toLineHistorySnapshot(line: InvoiceLine): InvoiceLineHistorySnapshot {
  return {
    id: line.id,
    type: line.type,
    description: line.description,
    quantity: moneyString(line.quantity),
    unitPrice: moneyString(line.unitPrice),
    acquisitionCostDop: line.acquisitionCostDop == null ? null : moneyString(line.acquisitionCostDop),
    costProvenance: line.costProvenance,
    serviceId: line.serviceId,
  };
}
