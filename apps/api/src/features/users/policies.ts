import type { Role } from '@prisma/client';

import { AppError } from '../../infrastructure/errors/app-error.js';

export function assertPasswordChanged(user: { mustChangePassword: boolean }): void {
  if (user.mustChangePassword) {
    throw new AppError('FORBIDDEN', 'Password change required', {
      reason: 'PASSWORD_CHANGE_REQUIRED',
    });
  }
}

export function assertAdministrator(
  user: { active: boolean; role: Role; mustChangePassword: boolean } | null,
): void {
  if (!user?.active) throw AppError.unauthorized();
  assertPasswordChanged(user);
  if (user.role !== 'ADMINISTRATOR') throw AppError.forbidden();
}
