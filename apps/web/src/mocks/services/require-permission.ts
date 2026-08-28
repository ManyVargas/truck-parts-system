import type { User } from '../../api/contracts/entities';
import type { PolicyAction } from '../../shared/auth/policies';
import { can } from '../../shared/auth/policies';
import { err, ok, type Result } from '../../shared/auth/types';
import { getSession } from '../session';
import { getMockState } from '../state';

/**
 * Validates the current mock session against policies before a mutation.
 * Route guards are UX-only; services must call this (or equivalent) server-side in production.
 */
export function requirePermission(action: PolicyAction): Result<User> {
  const session = getSession();

  if (!session) {
    return err({ code: 'UNAUTHORIZED', message: 'Debe iniciar sesión para realizar esta acción' });
  }

  const user = getMockState().users.find((entry) => entry.id === session.userId);

  if (!user) {
    return err({ code: 'UNAUTHORIZED', message: 'Sesión inválida' });
  }

  if (!user.active) {
    return err({ code: 'FORBIDDEN', message: 'Esta cuenta está desactivada' });
  }

  if (!can(user, action)) {
    return err({ code: 'FORBIDDEN', message: 'No tiene permiso para realizar esta acción' });
  }

  return ok(user);
}
