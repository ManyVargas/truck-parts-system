import { useCallback, useEffect, useState } from 'react';

import type { Category } from '../../api/contracts/entities';
import type { InventoryListFilters, InventoryListRow } from '../../api/contracts/inventory';
import type { AppError } from '../../shared/auth/types';
import { mockCategoryRepository, mockInventoryRepository } from '../../mocks/repositories';

type CatalogQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; rows: InventoryListRow[] };

const DEFAULT_FILTERS: InventoryListFilters = {
  query: '',
  includeSold: false,
};

/**
 * Loads the unified inventory catalog. Features never import seed or services.
 */
export function useInventoryCatalog() {
  const [filters, setFilters] = useState<InventoryListFilters>(DEFAULT_FILTERS);
  const [result, setResult] = useState<CatalogQuery>({ status: 'loading' });
  const [categories, setCategories] = useState<Category[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    mockCategoryRepository.list().then((response) => {
      if (response.ok) {
        setCategories(response.value);
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setResult({ status: 'loading' });

    mockInventoryRepository.listCatalog(filters).then((response) => {
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
  }, [filters, reloadToken]);

  const patchFilters = useCallback((patch: Partial<InventoryListFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const refresh = useCallback(() => setReloadToken((current) => current + 1), []);

  return { filters, patchFilters, result, categories, refresh };
}
