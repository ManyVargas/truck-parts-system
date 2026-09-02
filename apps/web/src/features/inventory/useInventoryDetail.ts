import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type {
  AddToDraftInput,
  BaselineCorrectionInput,
  CostCorrectionInput,
  InventoryDetail,
  ManualWorkOrderInput,
  NoDesarmarInput,
  ResolveCatalogReviewInput,
} from '../../api/contracts/inventory';
import type { AppError, Result } from '../../shared/auth/types';
import { inventoryRepository } from '../../api/repositories';

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

    inventoryRepository.getDetail(id).then((response) => {
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
      const response = await inventoryRepository.addToDraft(input);
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
    const response = await inventoryRepository.setNoDesarmar(input);
    setIsMutating(false);
    if (!response.ok) {
      return response;
    }
    reload();
    return { ok: true, value: undefined };
  }, [reload]);

  const correctCost = useCallback(async (input: CostCorrectionInput): Promise<Result<void>> => {
    setIsMutating(true);
    const response = await inventoryRepository.correctAcquisitionCost(input);
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
      const response = await inventoryRepository.correctReceiptBaseline(input);
      setIsMutating(false);
      if (!response.ok) {
        return response;
      }
      reload();
      return { ok: true, value: undefined };
    },
    [reload],
  );

  const resolveCatalogReview = useCallback(
    async (input: ResolveCatalogReviewInput): Promise<Result<void>> => {
      setIsMutating(true);
      const response = await inventoryRepository.resolveCatalogReview(input);
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
      const response = await inventoryRepository.createManualWorkOrder(input);
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
    resolveCatalogReview,
    createWorkOrder,
  };
}
