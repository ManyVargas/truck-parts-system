import type { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../../infrastructure/errors/app-error.js';
import { INSUFFICIENT_PERMISSIONS_MESSAGE } from './constants.js';

/**
 * HTTP role gate. Must run after requireAuth so 401 (no session) stays distinct from 403 (wrong role).
 * Services that mutate data should repeat the same role check; hiding UI is not authorization (AUTH-005).
 */
export function requireRole(...allowedRoles: Role[]) {
  return function requireRoleMiddleware(req: Request, _res: Response, next: NextFunction): void {
    if (!req.auth) {
      next(AppError.unauthorized());
      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      next(AppError.forbidden(INSUFFICIENT_PERMISSIONS_MESSAGE));
      return;
    }

    next();
  };
}

export const requireAdministrator = requireRole('ADMINISTRATOR');
