import { useCallback, useEffect, useState } from 'react';

import type { ManagedUser, SaveUserInput } from '../../api/contracts/users';
import type { AppError, Result } from '../../shared/auth/types';
import { mockUserRepository } from '../../mocks/repositories';

type UsersQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; rows: ManagedUser[] };

/**
 * Loads administrator user management. Features never import seed or user services.
 */
export function useUsers() {
  const [query, setQuery] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<UsersQuery>({ status: 'loading' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResult({ status: 'loading' });

    mockUserRepository.list().then((response) => {
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setResult({ status: 'error', error: response.error });
        return;
      }

      const normalized = query.trim().toLowerCase();
      const rows = normalized
        ? response.value.filter(
            (user) =>
              user.name.toLowerCase().includes(normalized) ||
              user.username.toLowerCase().includes(normalized),
          )
        : response.value;

      setResult({ status: 'ready', rows });
    });

    return () => {
      cancelled = true;
    };
  }, [query, reloadToken]);

  const save = useCallback(async (input: SaveUserInput): Promise<Result<string>> => {
    setIsSaving(true);
    const response = await mockUserRepository.save(input);
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
  };
}
