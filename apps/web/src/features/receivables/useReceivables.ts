import { useEffect, useState } from 'react';

import type { ReceivablesSnapshot } from '../../api/contracts/sales';
import { salesRepository } from '../../api/repositories';
import type { AppError } from '../../shared/auth/types';

type ReceivablesQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; snapshot: ReceivablesSnapshot };

export function useReceivables() {
  const [result, setResult] = useState<ReceivablesQuery>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setResult({ status: 'loading' });
    salesRepository.listReceivables().then((response) => {
      if (cancelled) return;
      if (!response.ok) {
        setResult({ status: 'error', error: response.error });
        return;
      }
      setResult({ status: 'ready', snapshot: response.value });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return result;
}
