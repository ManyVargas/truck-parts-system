import { useCallback, useEffect, useState } from 'react';

import type { SalesListRow, SalesListTab } from '../../api/contracts/sales';
import type { AppError } from '../../shared/auth/types';
import { mockSalesRepository } from '../../mocks/repositories';

type SalesQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; rows: SalesListRow[] };

export function useSalesList(tab: SalesListTab) {
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<SalesQuery>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setResult({ status: 'loading' });

    mockSalesRepository.listInvoices(tab).then((response) => {
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setResult({ status: 'error', error: response.error });
        return;
      }

      setResult({ status: 'ready', rows: response.value });
    });

    return () => {
      cancelled = true;
    };
  }, [tab, reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return { result, reload };
}
