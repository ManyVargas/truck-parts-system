import { Prisma, type InvoiceLine } from '@prisma/client';

import { MONEY_DECIMAL_PLACES } from './money/constants.js';
import {
  calculateLineMoney,
  calculateLineProfitDop,
  calculatedCompletedProfitability,
  isTaxableLineType,
  reportedInvoiceProfitability,
  sumInvoiceMoney,
} from './money/index.js';
import { PROFITABILITY_REASONS, type Profitability } from './money/types.js';
import type {
  InvoiceConfirmedHistorySnapshot,
  InvoiceCustomerSnapshot,
  InvoiceDraftHistorySnapshot,
  InvoiceLineHistorySnapshot,
  InvoiceListRecord,
  InvoiceRecord,
  InvoiceViewer,
  PublicInvoice,
  PublicInvoiceLine,
  PublicInvoiceListItem,
  PublicProfitability,
} from './types.js';

function moneyString(value: { toFixed(places: number): string }): string {
  return value.toFixed(MONEY_DECIMAL_PLACES);
}

function toPublicProfitability(value: Profitability): PublicProfitability {
  return {
    status: value.status,
    reason: value.reason,
    profitDop: value.profitDop == null ? null : moneyString(value.profitDop),
    margin: value.margin == null ? null : moneyString(value.margin),
  };
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

function lineProfitInput(line: InvoiceLine) {
  return {
    type: line.type,
    unitPrice: line.unitPrice,
    quantity: line.quantity,
    gross: line.gross,
    acquisitionCostDop: line.acquisitionCostDop,
    costProvenance: line.costProvenance,
  };
}

function invoiceSellingPrice(invoice: InvoiceRecord | InvoiceListRecord): Prisma.Decimal {
  if (invoice.gross != null) return invoice.gross;
  return new Prisma.Decimal(invoiceTotals(invoice).gross);
}

function deriveCompletedProfitability(invoice: InvoiceRecord | InvoiceListRecord): {
  invoice: PublicProfitability;
  lines: PublicProfitability[];
} | null {
  const lineInputs = invoice.lines.map(lineProfitInput);
  const calculated = calculatedCompletedProfitability({
    status: invoice.status,
    currency: invoice.currency,
    fiscal: invoice.fiscal,
    lines: lineInputs,
  });
  const reported = reportedInvoiceProfitability(
    calculated,
    invoice.manualGrossProfitDop,
    invoiceSellingPrice(invoice),
  );
  if (reported == null) return null;

  if (reported.reason === PROFITABILITY_REASONS.PENDING_FX_RATE) {
    const pendingFx = toPublicProfitability(reported);
    return {
      invoice: pendingFx,
      lines: invoice.lines.map(() => pendingFx),
    };
  }

  return {
    invoice: toPublicProfitability(reported),
    lines: lineInputs.map((input) =>
      toPublicProfitability(calculateLineProfitDop(input, invoice.fiscal)),
    ),
  };
}

export function toManualGrossProfitHistorySnapshot(
  before: { toFixed(places: number): string } | null,
  after: { toFixed(places: number): string },
) {
  return {
    before: before == null ? null : moneyString(before),
    after: moneyString(after),
  };
}

function administratorProfitability(
  invoice: InvoiceRecord | InvoiceListRecord,
  viewer: InvoiceViewer,
) {
  if (viewer.role !== 'ADMINISTRATOR') return null;
  return deriveCompletedProfitability(invoice);
}

function toPublicLine(
  line: InvoiceLine,
  fiscal: boolean,
  profitability?: PublicProfitability,
): PublicInvoiceLine {
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
    ...(profitability ? { profitability } : {}),
  };
}

function invoiceTotals(invoice: InvoiceRecord | InvoiceListRecord) {
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

export function toPublicInvoice(invoice: InvoiceRecord, viewer: InvoiceViewer): PublicInvoice {
  const profitability = administratorProfitability(invoice, viewer);
  return {
    id: invoice.id,
    status: invoice.status,
    number: invoice.number,
    currency: invoice.currency,
    fiscal: invoice.fiscal,
    customer: toCustomerView(invoice),
    customerSnapshot: customerSnapshotOf(invoice),
    confirmedAt: invoice.confirmedAt?.toISOString() ?? null,
    lines: invoice.lines.map((line, index) =>
      toPublicLine(line, invoice.fiscal, profitability?.lines[index]),
    ),
    totals: invoiceTotals(invoice),
    ...(profitability ? { profitability: profitability.invoice } : {}),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export function toPublicInvoiceListItem(
  invoice: InvoiceListRecord,
  viewer: InvoiceViewer,
): PublicInvoiceListItem {
  const profitability = administratorProfitability(invoice, viewer);
  return {
    id: invoice.id,
    status: invoice.status,
    number: invoice.number,
    currency: invoice.currency,
    fiscal: invoice.fiscal,
    customer: toCustomerView(invoice),
    customerSnapshot: customerSnapshotOf(invoice),
    confirmedAt: invoice.confirmedAt?.toISOString() ?? null,
    ...(profitability ? { profitability: profitability.invoice } : {}),
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
