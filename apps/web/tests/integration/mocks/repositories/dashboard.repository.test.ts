import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mockDashboardRepository } from '../../../../src/mocks/repositories/MockDashboardRepository';
import { resetMockState } from '../../../../src/mocks/state';
import { signInAs } from '../../../support/session';

describe('MockDashboardRepository', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  it('includes profitability only for administrators', async () => {
    signInAs('ADMINISTRATOR');
    const admin = await mockDashboardRepository.getSnapshot();

    expect(admin.ok && admin.value.kpis.profitDop).toBe(8900);
    expect(admin.ok && admin.value.kpis.pendingFx).toBe(1);

    resetMockState();
    signInAs('SELLER');
    const seller = await mockDashboardRepository.getSnapshot();

    expect(seller.ok && seller.value.kpis.profitDop).toBeUndefined();
    expect(seller.ok && seller.value.kpis.pendingFx).toBeUndefined();
  });

  it('denies mechanics and unauthenticated callers', async () => {
    const guest = await mockDashboardRepository.getSnapshot();
    expect(guest.ok).toBe(false);
    if (!guest.ok) {
      expect(guest.error.code).toBe('UNAUTHORIZED');
    }

    signInAs('MECHANIC');
    const mechanic = await mockDashboardRepository.getSnapshot();
    expect(mechanic.ok).toBe(false);
    if (!mechanic.ok) {
      expect(mechanic.error.code).toBe('FORBIDDEN');
    }
  });
});
