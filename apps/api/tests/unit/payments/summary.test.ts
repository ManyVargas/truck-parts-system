import { Prisma, type InvoicePayment } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { databaseDate, invoiceDueDate } from '../../../src/features/payments/dates.js';
import { summarizePayments } from '../../../src/features/payments/summary.js';

function payment(id: string, amount: string, effectiveDate: string): InvoicePayment {
  return {
    id,
    invoiceId: '00000000-0000-4000-8000-000000000001',
    kind: 'PAYMENT',
    amount: new Prisma.Decimal(amount),
    currency: 'DOP',
    method: 'CASH',
    effectiveDate: databaseDate(effectiveDate),
    reference: null,
    actorUserId: '00000000-0000-4000-8000-000000000002',
    idempotencyKey: id,
    createdAt: new Date(`${effectiveDate}T16:00:00.000Z`),
  };
}

describe('payment summary', () => {
  it('keeps a partial balance pending through the end of its due date', () => {
    const summary = summarizePayments(
      {
        status: 'COMPLETED',
        gross: new Prisma.Decimal('1000.00'),
        dueDate: databaseDate('2026-10-10'),
        payments: [payment('partial', '250.00', '2026-09-20')],
      },
      new Date('2026-10-11T03:59:59.000Z'),
    );

    expect(summary.state).toBe('PENDING');
    expect(summary.balance.toFixed(2)).toBe('750.00');
  });

  it('becomes overdue after the due date in Santo Domingo', () => {
    const summary = summarizePayments(
      {
        status: 'COMPLETED',
        gross: new Prisma.Decimal('1000.00'),
        dueDate: databaseDate('2026-10-10'),
        payments: [],
      },
      new Date('2026-10-11T04:00:00.000Z'),
    );

    expect(summary.state).toBe('OVERDUE');
  });

  it('uses the effective settlement date to distinguish paid late', () => {
    const summary = summarizePayments(
      {
        status: 'COMPLETED',
        gross: new Prisma.Decimal('1000.00'),
        dueDate: databaseDate('2026-10-10'),
        payments: [
          payment('second-recorded', '600.00', '2026-10-11'),
          payment('first-effective', '400.00', '2026-10-01'),
        ],
      },
      new Date('2026-10-12T12:00:00.000Z'),
    );

    expect(summary.state).toBe('PAID_LATE');
    expect(summary.settledOn).toEqual(databaseDate('2026-10-11'));
  });

  it('lets cancellation override financial state and exposes zero balance', () => {
    const summary = summarizePayments({
      status: 'CANCELLED',
      gross: new Prisma.Decimal('1000.00'),
      dueDate: databaseDate('2026-10-10'),
      payments: [payment('received', '250.00', '2026-09-20')],
    });

    expect(summary.state).toBe('CANCELLED');
    expect(summary.balance.toFixed(2)).toBe('0.00');
  });
});

describe('invoice due date', () => {
  it('adds 30 local calendar days instead of 30 exact 24-hour periods', () => {
    expect(invoiceDueDate(new Date('2026-09-10T02:30:00.000Z'))).toEqual(
      databaseDate('2026-10-09'),
    );
    expect(invoiceDueDate(new Date('2026-09-10T04:30:00.000Z'))).toEqual(
      databaseDate('2026-10-10'),
    );
  });
});
