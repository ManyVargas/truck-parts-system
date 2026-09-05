import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../../infrastructure/errors/app-error.js';
import { accessService, toRequestAuth, type AccessService } from './service.js';
import { readSessionToken } from './session-cookie.js';
import { assertPasswordChanged } from '../users/policies.js';

export function createRequireAuth(
  service: AccessService = accessService,
  allowPasswordChange = false,
) {
  return async function requireAuth(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const sessionToken = readSessionToken(req);
      if (!sessionToken) {
        throw AppError.unauthorized();
      }

      const user = await service.resolveSession(sessionToken);
      if (!allowPasswordChange) assertPasswordChanged(user);
      req.auth = toRequestAuth(user);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAuth = createRequireAuth();
export const requireProfileAuth = createRequireAuth(accessService, true);
