import { describe, expect, it } from 'vitest';

import { createInitialState } from '../data/seed';
import { invoiceBalance, invoiceTotal, lineItbis } from './invoice-money';
import { invoiceProfitDop } from './gross-profit';
import { buildDashboardSnapshot } from './dashboard-snapshot';

const DEMO_DAY = '2026-08-25T16:00:00.000Z';

describe('invoice-money', () => {
  it('keeps ITBIS at 0 when the invoice is not fiscal', () => {
    const state = createInitialState();
    const invoice = state.invoices.find((entry) => entry.id === 'INV-099');
    expect(invoice).toBeDefined();
    expect(invoiceTotal(invoice!)).toBe(7200);
    expect(lineItbis(invoice!.lines[0], invoice!.fiscal)).toBe(0);
    expect(invoiceBalance(invoice!)).toBe(3600);
  });

  it('extracts included 18% ITBIS on fiscal taxable lines without changing the gross total', () => {
    const state = createInitialState();
    const invoice = state.invoices.find((entry) => entry.id === 'INV-098');
    expect(invoice).toBeDefined();
    expect(invoiceTotal(invoice!)).toBe(19500);
    expect(lineItbis(invoice!.lines[0], true)).toBe(2974.58);
    expect(invoiceBalance(invoice!)).toBe(19500);
  });

  it('treats PAID invoices as zero balance even without payment rows', () => {
    const state = createInitialState();
    const invoice = state.invoices.find((entry) => entry.id === 'INV-096');
    expect(invoiceBalance(invoice!)).toBe(0);
  });
});

describe('buildDashboardSnapshot', () => {
  it('matches seed aggregates after reset for Administrator', () => {
    const snapshot = buildDashboardSnapshot(createInitialState(), {
      nowIso: DEMO_DAY,
      includeProfitability: true,
    });

    expect(snapshot.kpis).toEqual({
      availableInventory: 78,
      invoicesToday: 2,
      outstandingDop: 23100,
      outstandingUsd: 0,
      draftCount: 1,
      pendingDismantling: 1,
      workOrdersInProgress: 1,
      incompleteAssemblies: 2,
      profitDop: 8900,
      pendingFx: 1,
    });

    expect(snapshot.recentInvoices[0]?.number).toBe('FAC-000099');
    expect(snapshot.activity[0]?.id).toBe('EV-003');
  });

  it('omits profitability fields for Seller projections', () => {
    const snapshot = buildDashboardSnapshot(createInitialState(), {
      nowIso: DEMO_DAY,
      includeProfitability: false,
    });

    expect(snapshot.kpis.profitDop).toBeUndefined();
    expect(snapshot.kpis.pendingFx).toBeUndefined();
    expect(snapshot.kpis.draftCount).toBe(1);
    expect(snapshot.kpis.availableInventory).toBe(78);
  });

  it('skips invoices with unknown cost instead of inventing profit', () => {
    const state = createInitialState();
    const generic = state.invoices.find((entry) => entry.id === 'INV-097');
    expect(invoiceProfitDop(generic!, state)).toBeNull();
  });
});
