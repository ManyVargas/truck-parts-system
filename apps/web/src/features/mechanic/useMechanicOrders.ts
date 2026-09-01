import { useCallback, useEffect, useState } from 'react';

import type { MechanicWorkOrderView, WorkOrderType } from '../../api/contracts/entities';
import type { AddWorkOrderPhotoInput, CompleteWorkOrderInput } from '../../api/contracts/work-orders';
import type { AppError, Result } from '../../shared/auth/types';
import { mockWorkOrderRepository } from '../../mocks/repositories';

type Query =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; orders: MechanicWorkOrderView[] };

export function useMechanicOrders() {
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<Query>({ status: 'loading' });
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResult({ status: 'loading' });

    mockWorkOrderRepository.listForMechanic().then((response) => {
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setResult({ status: 'error', error: response.error });
        return;
      }

      setResult({ status: 'ready', orders: response.value });
    });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const takeOrder = useCallback(
    async (workOrderId: string): Promise<Result<MechanicWorkOrderView>> => {
      setIsMutating(true);
      const response = await mockWorkOrderRepository.takeOrder(workOrderId);
      setIsMutating(false);
      if (response.ok || response.error.code === 'CONFLICT') {
        reload();
      }
      return response;
    },
    [reload],
  );

  return { result, isMutating, takeOrder, reload };
}

type DetailQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; order: MechanicWorkOrderView };

export function useMechanicOrder(id: string | undefined) {
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<DetailQuery>({ status: 'loading' });
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    if (!id) {
      setResult({
        status: 'error',
        error: { code: 'VALIDATION', message: 'Falta el identificador' },
      });
      return;
    }

    setResult({ status: 'loading' });
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    mockWorkOrderRepository.getForMechanic(id).then((response) => {
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setResult({ status: 'error', error: response.error });
        return;
      }

      setResult({ status: 'ready', order: response.value });
    });

    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const addPhoto = useCallback(
    async (input: AddWorkOrderPhotoInput): Promise<Result<MechanicWorkOrderView>> => {
      setIsMutating(true);
      const response = await mockWorkOrderRepository.addPhoto(input);
      setIsMutating(false);
      if (response.ok) {
        setResult({ status: 'ready', order: response.value });
      }
      return response;
    },
    [],
  );

  const complete = useCallback(
    async (
      input: CompleteWorkOrderInput,
      type: WorkOrderType,
    ): Promise<Result<MechanicWorkOrderView>> => {
      setIsMutating(true);
      const response =
        type === 'INSTALLATION'
          ? await mockWorkOrderRepository.completeInstalacion(input)
          : await mockWorkOrderRepository.completeDesarme(input);
      setIsMutating(false);
      if (response.ok) {
        setResult({ status: 'ready', order: response.value });
      }
      return response;
    },
    [],
  );

  return { result, isMutating, addPhoto, complete, reload };
}
