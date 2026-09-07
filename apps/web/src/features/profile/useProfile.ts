import { useCallback, useState } from 'react';

import type { UpdateOwnProfileInput, UpdateOwnProfileResult } from '../../api/contracts/profile';
import { authRepository } from '../../api/repositories';
import { useMockApi } from '../../api/client/http-client';
import type { Result } from '../../shared/auth/types';
import { useAuth } from '../auth/useAuth';

/**
 * Saves the signed-in user's profile through AuthRepository, then refreshes
 * session projection so the header name updates without a full reload.
 */
export function useProfile() {
  const { user, refresh, clearSession } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (input: UpdateOwnProfileInput): Promise<Result<UpdateOwnProfileResult>> => {
      setIsSaving(true);
      const response = await authRepository.updateOwnProfile(input);
      setIsSaving(false);

      if (response.ok) {
        if (!useMockApi && input.newPassword !== undefined) {
          // A successful password update already revoked every session on the server.
          clearSession();
        } else await refresh();
      } else if (response.error.code === 'UNAUTHORIZED') {
        clearSession();
      } else if (response.error.details?.reason === 'PASSWORD_CHANGE_REQUIRED') {
        await refresh();
      }

      return response;
    },
    [refresh, clearSession],
  );

  return { user, isSaving, save };
}
