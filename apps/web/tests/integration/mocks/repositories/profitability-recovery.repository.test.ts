import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mockProfitabilityRepository } from '../../../../src/mocks/repositories/MockProfitabilityRepository';
import { mockRecoveryRepository } from '../../../../src/mocks/repositories/MockRecoveryRepository';
import { resetMockState } from '../../../../src/mocks/state';
import { signInAs } from '../../../support/session';

describe('profitability and recovery repositories', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  it('forbids seller profitability reads', async () => {
    signInAs('SELLER');
    const snapshot = await mockProfitabilityRepository.getSnapshot();
    expect(snapshot.ok).toBe(false);
    if (!snapshot.ok) {
      expect(snapshot.error.code).toBe('FORBIDDEN');
    }
  });

  it('allows admin recovery of the seed draft', async () => {
    signInAs('ADMINISTRATOR');
    const released = await mockRecoveryRepository.releaseReservation({
      draftId: 'INV-DRAFT-01',
      reason: 'Demo',
    });
    expect(released.ok).toBe(true);
  });

  it('lets an administrator persist a judged gross profit for unknown cost', async () => {
    signInAs('ADMINISTRATOR');
    const recorded = await mockProfitabilityRepository.recordManualGrossProfit({
      invoiceId: 'INV-097',
      profitDop: 900,
    });
    expect(recorded.ok).toBe(true);
    if (recorded.ok) {
      const row = recorded.value.invoices.find((entry) => entry.id === 'INV-097');
      expect(row?.profit).toBe(900);
      expect(row?.source).toBe('MANUAL');
    }
  });

  it('forbids seller manual gross-profit recording', async () => {
    signInAs('SELLER');
    const recorded = await mockProfitabilityRepository.recordManualGrossProfit({
      invoiceId: 'INV-097',
      profitDop: 900,
    });
    expect(recorded.ok).toBe(false);
    if (!recorded.ok) {
      expect(recorded.error.code).toBe('FORBIDDEN');
    }
  });
});
