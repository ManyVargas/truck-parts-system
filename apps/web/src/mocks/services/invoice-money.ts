import type { Invoice, InvoiceLine } from '../../api/contracts/entities';

/** Included ITBIS rate — applied only when the invoice is fiscal and the line is taxable. */
export const ITBIS_INCLUDED_RATE = 0.18;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Final line price (tax-inclusive when fiscal). */
export function lineGross(line: InvoiceLine): number {
  return roundMoney(line.unitPrice * line.quantity);
}

/**
 * Included ITBIS extracted from the final price.
 * Non-fiscal invoices and non-taxable lines (service/delivery) yield 0.
 */
export function lineItbis(line: InvoiceLine, fiscal: boolean): number {
  if (!fiscal || !line.taxable) {
    return 0;
  }

  const gross = lineGross(line);
  const base = roundMoney(gross / (1 + ITBIS_INCLUDED_RATE));
  return roundMoney(gross - base);
}

export function invoiceTotal(invoice: Invoice): number {
  return roundMoney(invoice.lines.reduce((sum, line) => sum + lineGross(line), 0));
}

export function invoicePaid(invoice: Invoice): number {
  return roundMoney(invoice.payments.reduce((sum, payment) => sum + payment.amount, 0));
}

/**
 * Remaining customer balance for a completed invoice.
 * Relies on `paymentState` so a seed marked PAID without payment rows is not treated as CxC.
 */
export function invoiceBalance(invoice: Invoice): number {
  if (invoice.status !== 'COMPLETED' || invoice.paymentState === 'PAID') {
    return 0;
  }

  return roundMoney(invoiceTotal(invoice) - invoicePaid(invoice));
}

export function utcCalendarDate(iso: string): string {
  return iso.slice(0, 10);
}
