import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mockSalesRepository } from '../../../../src/mocks/repositories/MockSalesRepository';
import { getMockState, resetMockState } from '../../../../src/mocks/state';
import { signInAs } from '../../../support/session';

describe('MockSalesRepository', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  it('lists seed invoices for seller and admin', async () => {
    signInAs('SELLER');
    const listed = await mockSalesRepository.listInvoices();

    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value.some((row) => row.number === 'FAC-000098' && row.paymentState === 'UNPAID')).toBe(
        true,
      );
      expect(
        listed.value.some((row) => row.number === 'FAC-000099' && row.paymentState === 'PARTIALLY_PAID'),
      ).toBe(true);
    }
  });

  it('persists a payment and returns the updated detail', async () => {
    signInAs('SELLER');
    const paid = await mockSalesRepository.addPayment({
      invoiceId: 'INV-098',
      amount: 19_500,
      method: 'CASH',
    });
    const loaded = await mockSalesRepository.getInvoice('INV-098');

    expect(paid.ok && paid.value.paymentState).toBe('PAID');
    expect(loaded.ok && loaded.value.balance).toBe(0);
    expect(getMockState().invoices.find((entry) => entry.id === 'INV-098')?.payments).toHaveLength(1);
  });

  it('denies cancellation and currency correction to the seller', async () => {
    signInAs('SELLER');

    const cancelled = await mockSalesRepository.cancelInvoice({
      invoiceId: 'INV-097',
      reason: 'No debería',
    });
    const corrected = await mockSalesRepository.correctCurrency({
      invoiceId: 'INV-098',
      currency: 'USD',
      reason: 'No debería',
    });

    expect(cancelled.ok).toBe(false);
    expect(corrected.ok).toBe(false);
    if (!cancelled.ok) {
      expect(cancelled.error.code).toBe('FORBIDDEN');
    }
  });

  it('cancels as administrator and keeps the original document', async () => {
    signInAs('ADMINISTRATOR');
    const result = await mockSalesRepository.cancelInvoice({
      invoiceId: 'INV-097',
      reason: 'Cliente devolvió la mercancía',
      refundAmount: 5_500,
      refundMethod: 'CASH',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('CANCELLED');
      expect(result.value.cancelReason).toBe('Cliente devolvió la mercancía');
      expect(result.value.number).toBe('FAC-000097');
    }
  });

  it('denies mechanic access', async () => {
    signInAs('MECHANIC');
    const result = await mockSalesRepository.listInvoices();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });
});
