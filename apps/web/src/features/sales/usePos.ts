import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type {
  AddDraftLineInput,
  ConfirmInvoicePayment,
  PosDraftView,
  SetDraftMetaInput,
} from '../../api/contracts/sales';
import type { AppError, Result } from '../../shared/auth/types';
import { salesRepository } from '../../api/repositories';

type PosQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; draft: PosDraftView };

export function usePos(draftId: string | undefined) {
  const navigate = useNavigate();
  const draftCreationRef = useRef<ReturnType<typeof salesRepository.createDraft> | null>(null);
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
      draftCreationRef.current ??= salesRepository.createDraft();
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
    salesRepository.getDraft(draftId).then((response) => {
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

  const mutationLock = useRef(false);

  const runExclusive = useCallback(async (work: () => Promise<Result<void>>): Promise<Result<void>> => {
    if (mutationLock.current) {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: 'Hay otra operación en curso. Espere un momento.' },
      };
    }

    mutationLock.current = true;
    setIsMutating(true);
    try {
      return await work();
    } finally {
      mutationLock.current = false;
      setIsMutating(false);
    }
  }, []);

  const addLine = useCallback(
    async (input: Omit<AddDraftLineInput, 'draftId'>): Promise<Result<void>> => {
      if (!draftId || draftId === 'new') {
        return { ok: false, error: { code: 'VALIDATION', message: 'Borrador no listo' } };
      }
      return runExclusive(async () => applyDraftResult(await salesRepository.addLine({ ...input, draftId })));
    },
    [applyDraftResult, draftId, runExclusive],
  );

  const removeLine = useCallback(
    async (lineId: string): Promise<Result<void>> => {
      if (!draftId || draftId === 'new') {
        return { ok: false, error: { code: 'VALIDATION', message: 'Borrador no listo' } };
      }
      return runExclusive(async () =>
        applyDraftResult(await salesRepository.removeLine({ draftId, lineId })),
      );
    },
    [applyDraftResult, draftId, runExclusive],
  );

  const setLinePrice = useCallback(
    async (lineId: string, unitPrice: number): Promise<Result<void>> => {
      if (!draftId || draftId === 'new') {
        return { ok: false, error: { code: 'VALIDATION', message: 'Borrador no listo' } };
      }
      return runExclusive(async () =>
        applyDraftResult(await salesRepository.setLinePrice({ draftId, lineId, unitPrice })),
      );
    },
    [applyDraftResult, draftId, runExclusive],
  );

  const setMeta = useCallback(
    async (input: Omit<SetDraftMetaInput, 'draftId'>): Promise<Result<void>> => {
      if (!draftId || draftId === 'new') {
        return { ok: false, error: { code: 'VALIDATION', message: 'Borrador no listo' } };
      }
      return runExclusive(async () =>
        applyDraftResult(await salesRepository.setDraftMeta({ ...input, draftId })),
      );
    },
    [applyDraftResult, draftId, runExclusive],
  );

  const confirm = useCallback(
    async (payment?: ConfirmInvoicePayment): Promise<Result<void>> => {
      if (!draftId || draftId === 'new') {
        return { ok: false, error: { code: 'VALIDATION', message: 'Borrador no listo' } };
      }
      return runExclusive(async () => {
        const response = await salesRepository.confirmInvoice(draftId, payment);
        if (!response.ok) {
          return response;
        }
        reload();
        return { ok: true, value: undefined };
      });
    },
    [draftId, reload, runExclusive],
  );

  const discard = useCallback(async (): Promise<Result<void>> => {
    if (!draftId || draftId === 'new') {
      return { ok: false, error: { code: 'VALIDATION', message: 'Borrador no listo' } };
    }
    return runExclusive(async () => {
      const response = await salesRepository.discardDraft(draftId);
      if (!response.ok) {
        return response;
      }
      navigate('/sales');
      return { ok: true, value: undefined };
    });
  }, [draftId, navigate, runExclusive]);

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
