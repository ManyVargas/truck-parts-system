import { useCallback, useState } from 'react';

import type { UpdateOwnProfileInput, UpdateOwnProfileResult } from '../../api/contracts/profile';
import { mockAuthRepository } from '../../mocks/repositories';
import type { Result } from '../../shared/auth/types';
import { useAuth } from '../auth/useAuth';

/**
 * Saves the signed-in user's profile through AuthRepository, then refreshes
 * session projection so the header name updates without a full reload.
 */
export function useProfile() {
  const { user, refresh } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (input: UpdateOwnProfileInput): Promise<Result<UpdateOwnProfileResult>> => {
      setIsSaving(true);
      const response = await mockAuthRepository.updateOwnProfile(input);
      setIsSaving(false);

      if (response.ok) {
        await refresh();
      }

      return response;
    },
    [refresh],
  );

  return { user, isSaving, save };
}
