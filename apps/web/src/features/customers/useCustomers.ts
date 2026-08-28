import { useCallback, useEffect, useState } from 'react';

import type { CustomerListRow, SaveCustomerInput } from '../../api/contracts/customers';
import type { AppError, Result } from '../../shared/auth/types';
import { mockCustomerRepository } from '../../mocks/repositories';

type CustomersQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; rows: CustomerListRow[] };

/**
 * Loads the customer directory from the repository.
 * Features never import seed or customer services.
 */
export function useCustomers() {
  const [query, setQuery] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<CustomersQuery>({ status: 'loading' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResult({ status: 'loading' });

    mockCustomerRepository.search(query).then((response) => {
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
  }, [query, reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const save = useCallback(async (input: SaveCustomerInput): Promise<Result<CustomerListRow['id']>> => {
    setIsSaving(true);
    const response = await mockCustomerRepository.save(input);
    setIsSaving(false);

    if (!response.ok) {
      return response;
    }

    setReloadToken((token) => token + 1);
    return { ok: true, value: response.value.id };
  }, []);

  return {
    query,
    setQuery,
    result,
    isSaving,
    save,
    reload,
  };
}
