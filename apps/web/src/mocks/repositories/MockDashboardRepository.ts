import type { DashboardRepository } from '../../api/contracts/repositories';
import { can } from '../../shared/auth/policies';
import { ok } from '../../shared/auth/types';
import { DEMO_NOW_ISO } from '../data/demo-clock';
import { buildDashboardSnapshot } from '../services/dashboard-snapshot';
import { requirePermission } from '../services/require-permission';
import { getMockState } from '../state';

export class MockDashboardRepository implements DashboardRepository {
  async getSnapshot() {
    const permission = requirePermission('dashboard.view');
    if (!permission.ok) {
      return permission;
    }

    const snapshot = buildDashboardSnapshot(getMockState(), {
      nowIso: DEMO_NOW_ISO,
      includeProfitability: can(permission.value, 'profit.view'),
    });

    return ok(snapshot);
  }
}

export const mockDashboardRepository = new MockDashboardRepository();
