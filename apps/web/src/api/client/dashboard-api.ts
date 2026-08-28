import type { Result } from '../../shared/auth/types';
import type { DashboardSnapshot } from '../contracts/dashboard';

/**
 * Future HTTP dashboard client.
 * Features consume DashboardRepository; this module is the swap target for MockDashboardRepository.
 */
export async function getDashboardSnapshotWithHttp(): Promise<Result<DashboardSnapshot>> {
  throw new Error('HttpDashboardRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}
