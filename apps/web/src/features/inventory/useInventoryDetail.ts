import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type {
  AddToDraftInput,
  BaselineCorrectionInput,
  CostCorrectionInput,
  InventoryDetail,
  ManualWorkOrderInput,
  NoDesarmarInput,
} from '../../api/contracts/inventory';
import type { AppError, Result } from '../../shared/auth/types';
import { mockInventoryRepository } from '../../mocks/repositories';

type DetailQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; detail: InventoryDetail };

export function useInventoryDetail(id: string | undefined) {
  const navigate = useNavigate();
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<DetailQuery>({ status: 'loading' });
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    if (!id) {
      setResult({ status: 'error', error: { code: 'VALIDATION', message: 'Falta el identificador' } });
      return;
    }

    let cancelled = false;
    setResult({ status: 'loading' });

    mockInventoryRepository.getDetail(id).then((response) => {
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setResult({ status: 'error', error: response.error });
        return;
      }

      setResult({ status: 'ready', detail: response.value });
    });

    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const addToDraft = useCallback(
    async (input: AddToDraftInput): Promise<Result<void>> => {
      setIsMutating(true);
      const response = await mockInventoryRepository.addToDraft(input);
      setIsMutating(false);

      if (!response.ok) {
        return response;
      }

      navigate(`/sales/draft/${response.value.draftId}`);
      return { ok: true, value: undefined };
    },
    [navigate],
  );

  const setNoDesarmar = useCallback(async (input: NoDesarmarInput): Promise<Result<void>> => {
    setIsMutating(true);
    const response = await mockInventoryRepository.setNoDesarmar(input);
    setIsMutating(false);
    if (!response.ok) {
      return response;
    }
    reload();
    return { ok: true, value: undefined };
  }, [reload]);

  const correctCost = useCallback(async (input: CostCorrectionInput): Promise<Result<void>> => {
    setIsMutating(true);
    const response = await mockInventoryRepository.correctAcquisitionCost(input);
    setIsMutating(false);
    if (!response.ok) {
      return response;
    }
    reload();
    return { ok: true, value: undefined };
  }, [reload]);

  const correctBaseline = useCallback(
    async (input: BaselineCorrectionInput): Promise<Result<void>> => {
      setIsMutating(true);
      const response = await mockInventoryRepository.correctReceiptBaseline(input);
      setIsMutating(false);
      if (!response.ok) {
        return response;
      }
      reload();
      return { ok: true, value: undefined };
    },
    [reload],
  );

  const createWorkOrder = useCallback(
    async (input: ManualWorkOrderInput): Promise<Result<void>> => {
      setIsMutating(true);
      const response = await mockInventoryRepository.createManualWorkOrder(input);
      setIsMutating(false);
      if (!response.ok) {
        return response;
      }
      reload();
      return { ok: true, value: undefined };
    },
    [reload],
  );

  return {
    result,
    isMutating,
    addToDraft,
    setNoDesarmar,
    correctCost,
    correctBaseline,
    createWorkOrder,
  };
}
