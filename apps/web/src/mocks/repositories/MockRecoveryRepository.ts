import type { RecoveryRepository } from '../../api/contracts/repositories';
import type { RetryUsdProfitabilityInput } from '../../api/contracts/profitability';
import type { ReleaseReservationInput } from '../../api/contracts/recovery';
import { err, ok } from '../../shared/auth/types';
import { retryUsdProfitability } from '../services/profitability-commands';
import { buildRecoverySnapshot } from '../services/recovery-catalog';
import { releaseAbandonedReservation } from '../services/recovery-commands';
import { requirePermission } from '../services/require-permission';
import { cloneForRead, getMockState } from '../state';

export class MockRecoveryRepository implements RecoveryRepository {
  async getSnapshot() {
    const permission = requirePermission('recovery.manage');
    if (!permission.ok) {
      return permission;
    }

    return ok(cloneForRead(buildRecoverySnapshot(getMockState())));
  }

  async releaseReservation(input: ReleaseReservationInput) {
    const permission = requirePermission('recovery.manage');
    if (!permission.ok) {
      return permission;
    }

    const result = releaseAbandonedReservation(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(result.value));
  }

  async retryUsdProfitability(input: RetryUsdProfitabilityInput) {
    const permission = requirePermission('recovery.manage');
    if (!permission.ok) {
      return permission;
    }

    if (!permission.value || permission.value.role !== 'ADMINISTRATOR') {
      return err({ code: 'FORBIDDEN', message: 'No tiene permiso para realizar esta acción' });
    }

    const result = retryUsdProfitability(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(buildRecoverySnapshot(getMockState())));
  }
}

export const mockRecoveryRepository = new MockRecoveryRepository();
