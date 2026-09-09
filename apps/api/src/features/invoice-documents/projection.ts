import type { InvoiceLine } from '@prisma/client';

import {
  INVOICE_PDF_TEMPLATE_VERSION,
  type InvoicePdfFacts,
} from '../../infrastructure/invoice-pdf/index.js';
import { MONEY_DECIMAL_PLACES } from '../sales/money/constants.js';
import type { InvoicePdfHistorySnapshot, InvoiceRecord } from '../sales/types.js';

function moneyString(value: { toFixed(places: number): string }): string {
  return value.toFixed(MONEY_DECIMAL_PLACES);
}

function persistedLineMoney(line: InvoiceLine) {
  if (line.gross == null || line.base == null || line.itbis == null) return null;
  return { gross: line.gross, base: line.base, itbis: line.itbis };
}

export function toInvoicePdfFacts(invoice: InvoiceRecord): InvoicePdfFacts | null {
  if (
    invoice.status !== 'COMPLETED' ||
    invoice.number == null ||
    invoice.confirmedAt == null ||
    invoice.customerName == null ||
    invoice.gross == null ||
    invoice.base == null ||
    invoice.itbis == null
  ) {
    return null;
  }

  const lines: InvoicePdfFacts['lines'] = [];
  for (const line of invoice.lines) {
    const money = persistedLineMoney(line);
    if (money == null) return null;
    lines.push({
      description: line.description,
      quantity: moneyString(line.quantity),
      unitPrice: moneyString(line.unitPrice),
      gross: moneyString(money.gross),
      itbis: moneyString(money.itbis),
    });
  }

  return {
    number: invoice.number,
    currency: invoice.currency,
    fiscal: invoice.fiscal,
    customerName: invoice.customerName,
    customerRnc: invoice.customerRnc,
    confirmedAt: invoice.confirmedAt,
    lines,
    totals: {
      gross: moneyString(invoice.gross),
      base: moneyString(invoice.base),
      itbis: moneyString(invoice.itbis),
    },
    templateVersion: invoice.pdfTemplateVersion ?? INVOICE_PDF_TEMPLATE_VERSION,
  };
}

export function toInvoicePdfHistorySnapshot(input: {
  status: 'READY' | 'FAILED';
  errorId: string | null;
  templateVersion: string;
}): InvoicePdfHistorySnapshot {
  return {
    status: input.status,
    errorId: input.errorId,
    templateVersion: input.templateVersion,
  };
}
