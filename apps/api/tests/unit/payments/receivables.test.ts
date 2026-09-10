import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { customerOutstanding, type OpenReceivable } from '../../../src/features/payments/receivables.js';
import type { InvoiceListRecord } from '../../../src/features/sales/types.js';

function openRow(
  customerId: string,
  customerName: string,
  currency: 'DOP' | 'USD',
  invoiced: string,
  paid: string,
  balance: string,
): OpenReceivable {
  return {
    invoice: {
      customerId,
      customerName,
      currency,
      customer: { name: customerName },
    } as InvoiceListRecord,
    invoiced: new Prisma.Decimal(invoiced),
    paid: new Prisma.Decimal(paid),
    balance: new Prisma.Decimal(balance),
    state: 'PENDING',
  };
}

describe('customer outstanding summary', () => {
  it('groups by customer and currency without converting DOP and USD', () => {
    const rows = customerOutstanding([
      openRow('cust-a', 'Taller Norte', 'DOP', '1000.00', '250.00', '750.00'),
      openRow('cust-a', 'Taller Norte', 'USD', '200.00', '0.00', '200.00'),
      openRow('cust-a', 'Taller Norte', 'DOP', '400.00', '0.00', '400.00'),
    ]);

    expect(rows.map((row) => ({
      customerId: row.customerId,
      customerName: row.customerName,
      currency: row.currency,
      invoiceCount: row.invoiceCount,
      invoiced: row.invoiced.toFixed(2),
      paid: row.paid.toFixed(2),
      balance: row.balance.toFixed(2),
    }))).toEqual([
      {
        customerId: 'cust-a',
        customerName: 'Taller Norte',
        currency: 'DOP',
        invoiceCount: 2,
        invoiced: '1400.00',
        paid: '250.00',
        balance: '1150.00',
      },
      {
        customerId: 'cust-a',
        customerName: 'Taller Norte',
        currency: 'USD',
        invoiceCount: 1,
        invoiced: '200.00',
        paid: '0.00',
        balance: '200.00',
      },
    ]);
  });
});
