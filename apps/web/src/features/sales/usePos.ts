import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type {
  AddDraftLineInput,
  PosDraftView,
  SetDraftMetaInput,
} from '../../api/contracts/sales';
import type { AppError, Result } from '../../shared/auth/types';
import { mockSalesRepository } from '../../mocks/repositories';

type PosQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; draft: PosDraftView };

export function usePos(draftId: string | undefined) {
  const navigate = useNavigate();
  const draftCreationRef = useRef<ReturnType<typeof mockSalesRepository.createDraft> | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<PosQuery>({ status: 'loading' });
  const [isMutating, setIsMutating] = useState(false);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!draftId) {
      setResult({
        status: 'error',
        error: { code: 'VALIDATION', message: 'Falta el identificador del borrador' },
      });
      return;
    }

    if (draftId === 'new') {
      let cancelled = false;
      setResult({ status: 'loading' });
      draftCreationRef.current ??= mockSalesRepository.createDraft();
      draftCreationRef.current.then((response) => {
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setResult({ status: 'error', error: response.error });
          return;
        }
        navigate(`/sales/draft/${response.value.draftId}`, { replace: true });
      });
      return () => {
        cancelled = true;
      };
    }

    draftCreationRef.current = null;

    let cancelled = false;
    setResult({ status: 'loading' });
    mockSalesRepository.getDraft(draftId).then((response) => {
      if (cancelled) {
        return;
      }
      if (!response.ok) {
        setResult({ status: 'error', error: response.error });
        return;
      }
      setResult({ status: 'ready', draft: response.value });
    });

    return () => {
      cancelled = true;
    };
  }, [draftId, navigate, reloadToken]);

  const applyDraftResult = useCallback((response: Result<PosDraftView>): Result<void> => {
    if (!response.ok) {
      return response;
    }
    setResult({ status: 'ready', draft: response.value });
    return { ok: true, value: undefined };
  }, []);

  const addLine = useCallback(
    async (input: Omit<AddDraftLineInput, 'draftId'>): Promise<Result<void>> => {
      if (!draftId || draftId === 'new') {
        return { ok: false, error: { code: 'VALIDATION', message: 'Borrador no listo' } };
      }
      setIsMutating(true);
      const response = await mockSalesRepository.addLine({ ...input, draftId });
      setIsMutating(false);
      return applyDraftResult(response);
    },
    [applyDraftResult, draftId],
  );

  const removeLine = useCallback(
    async (lineId: string): Promise<Result<void>> => {
      if (!draftId || draftId === 'new') {
        return { ok: false, error: { code: 'VALIDATION', message: 'Borrador no listo' } };
      }
      setIsMutating(true);
      const response = await mockSalesRepository.removeLine({ draftId, lineId });
      setIsMutating(false);
      return applyDraftResult(response);
    },
    [applyDraftResult, draftId],
  );

  const setLinePrice = useCallback(
    async (lineId: string, unitPrice: number): Promise<Result<void>> => {
      if (!draftId || draftId === 'new') {
        return { ok: false, error: { code: 'VALIDATION', message: 'Borrador no listo' } };
      }
      setIsMutating(true);
      const response = await mockSalesRepository.setLinePrice({ draftId, lineId, unitPrice });
      setIsMutating(false);
      return applyDraftResult(response);
    },
    [applyDraftResult, draftId],
  );

  const setMeta = useCallback(
    async (input: Omit<SetDraftMetaInput, 'draftId'>): Promise<Result<void>> => {
      if (!draftId || draftId === 'new') {
        return { ok: false, error: { code: 'VALIDATION', message: 'Borrador no listo' } };
      }
      setIsMutating(true);
      const response = await mockSalesRepository.setDraftMeta({ ...input, draftId });
      setIsMutating(false);
      return applyDraftResult(response);
    },
    [applyDraftResult, draftId],
  );

  const confirm = useCallback(async (): Promise<Result<void>> => {
    if (!draftId || draftId === 'new') {
      return { ok: false, error: { code: 'VALIDATION', message: 'Borrador no listo' } };
    }
    setIsMutating(true);
    const response = await mockSalesRepository.confirmInvoice(draftId);
    setIsMutating(false);
    if (!response.ok) {
      return response;
    }
    reload();
    return { ok: true, value: undefined };
  }, [draftId, reload]);

  const discard = useCallback(async (): Promise<Result<void>> => {
    if (!draftId || draftId === 'new') {
      return { ok: false, error: { code: 'VALIDATION', message: 'Borrador no listo' } };
    }
    setIsMutating(true);
    const response = await mockSalesRepository.discardDraft(draftId);
    setIsMutating(false);
    if (!response.ok) {
      return response;
    }
    navigate('/inventory');
    return { ok: true, value: undefined };
  }, [draftId, navigate]);

  return {
    result,
    isMutating,
    addLine,
    removeLine,
    setLinePrice,
    setMeta,
    confirm,
    discard,
  };
}
