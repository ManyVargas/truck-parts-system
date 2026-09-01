import { useCallback, useEffect, useState } from 'react';

import type {
  CreateManualWorkOrderInput,
  WorkOrderCreateOptions,
  WorkOrderListRow,
  WorkOrderListTab,
} from '../../api/contracts/work-orders';
import type { AppError, Result } from '../../shared/auth/types';
import { mockWorkOrderRepository } from '../../mocks/repositories';

type WorkOrdersQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; rows: WorkOrderListRow[] };

export function useWorkOrders(tab: WorkOrderListTab) {
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<WorkOrdersQuery>({ status: 'loading' });
  const [createOptions, setCreateOptions] = useState<WorkOrderCreateOptions | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResult({ status: 'loading' });

    mockWorkOrderRepository.list(tab).then((response) => {
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

  useEffect(() => {
    let cancelled = false;

    mockWorkOrderRepository.getCreateOptions().then((response) => {
      if (cancelled || !response.ok) {
        return;
      }
      setCreateOptions(response.value);
    });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const createManual = useCallback(
    async (input: CreateManualWorkOrderInput): Promise<Result<string>> => {
      setIsMutating(true);
      const response = await mockWorkOrderRepository.createManual(input);
      setIsMutating(false);

      if (!response.ok) {
        return response;
      }

      reload();
      return { ok: true, value: response.value.id };
    },
    [reload],
  );

  return {
    result,
    createOptions,
    isMutating,
    createManual,
    reload,
  };
}
