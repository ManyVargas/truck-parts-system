import { useCallback, useEffect, useState } from 'react';

import type { SaveCategoryInput, SaveServiceInput } from '../../api/contracts/catalogs';
import type { Category, Service } from '../../api/contracts/entities';
import type { AppError, Result } from '../../shared/auth/types';
import { mockCategoryRepository, mockServiceRepository } from '../../mocks/repositories';

type CatalogTab = 'categories' | 'services';

type CategoriesQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; rows: Category[] };

type ServicesQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; rows: Service[] };

/**
 * Loads category and service catalogs. Features never import seed or catalog services.
 */
export function useCatalogs() {
  const [tab, setTab] = useState<CatalogTab>('categories');
  const [reloadToken, setReloadToken] = useState(0);
  const [categories, setCategories] = useState<CategoriesQuery>({ status: 'loading' });
  const [services, setServices] = useState<ServicesQuery>({ status: 'loading' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCategories({ status: 'loading' });
    setServices({ status: 'loading' });

    Promise.all([mockCategoryRepository.list(), mockServiceRepository.list()]).then(
      ([categoryResponse, serviceResponse]) => {
        if (cancelled) {
          return;
        }

        if (!categoryResponse.ok) {
          setCategories({ status: 'error', error: categoryResponse.error });
        } else {
          setCategories({ status: 'ready', rows: categoryResponse.value });
        }

        if (!serviceResponse.ok) {
          setServices({ status: 'error', error: serviceResponse.error });
        } else {
          setServices({ status: 'ready', rows: serviceResponse.value });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const saveCategory = useCallback(async (input: SaveCategoryInput): Promise<Result<string>> => {
    setIsSaving(true);
    const response = await mockCategoryRepository.save(input);
    setIsSaving(false);

    if (!response.ok) {
      return response;
    }

    setReloadToken((token) => token + 1);
    return { ok: true, value: response.value.id };
  }, []);

  const saveService = useCallback(async (input: SaveServiceInput): Promise<Result<string>> => {
    setIsSaving(true);
    const response = await mockServiceRepository.save(input);
    setIsSaving(false);

    if (!response.ok) {
      return response;
    }

    setReloadToken((token) => token + 1);
    return { ok: true, value: response.value.id };
  }, []);

  return {
    tab,
    setTab,
    categories,
    services,
    isSaving,
    saveCategory,
    saveService,
    reload,
  };
}

export type { CatalogTab };
