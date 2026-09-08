import type { InvoiceLine } from '@prisma/client';

import { MONEY_DECIMAL_PLACES } from './money/constants.js';
import { calculateLineMoney, isTaxableLineType, sumInvoiceMoney } from './money/index.js';
import type {
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

function toCustomerView(customer: InvoiceRecord['customer'] | InvoiceListRecord['customer']) {
  return {
    id: customer.id,
    name: customer.name,
    rnc: customer.rnc,
    isDefault: customer.isDefault,
  };
}

function toPublicLine(line: InvoiceLine, fiscal: boolean): PublicInvoiceLine {
  const money = calculateLineMoney({
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

export function toPublicInvoice(invoice: InvoiceRecord): PublicInvoice {
  const lines = invoice.lines.map((line) => toPublicLine(line, invoice.fiscal));
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
    id: invoice.id,
    status: invoice.status,
    number: invoice.number,
    currency: invoice.currency,
    fiscal: invoice.fiscal,
    customer: toCustomerView(invoice.customer),
    lines,
    totals: {
      gross: moneyString(totals.gross),
      base: moneyString(totals.base),
      itbis: moneyString(totals.itbis),
    },
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
    customer: toCustomerView(invoice.customer),
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
