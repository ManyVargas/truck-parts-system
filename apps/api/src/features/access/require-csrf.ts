import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../../infrastructure/errors/app-error.js';
import { CSRF_REQUEST_HEADER, CSRF_REQUEST_HEADER_VALUE } from './constants.js';

export function requireCsrfHeader(req: Request, _res: Response, next: NextFunction): void {
  if (req.get(CSRF_REQUEST_HEADER) !== CSRF_REQUEST_HEADER_VALUE) {
    next(AppError.forbidden('CSRF validation failed'));
    return;
  }

  next();
}
