import { useEffect, useState } from 'react';

import type { DashboardSnapshot } from '../../api/contracts/dashboard';
import type { AppError } from '../../shared/auth/types';
import { mockDashboardRepository } from '../../mocks/repositories';

type DashboardQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; snapshot: DashboardSnapshot };

/**
 * Loads the role-projected dashboard snapshot from the repository.
 * Features never import seed or aggregation services.
 */
export function useDashboard(): DashboardQuery {
  const [query, setQuery] = useState<DashboardQuery>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    mockDashboardRepository.getSnapshot().then((result) => {
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setQuery({ status: 'error', error: result.error });
        return;
      }

      setQuery({ status: 'ready', snapshot: result.value });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return query;
}
