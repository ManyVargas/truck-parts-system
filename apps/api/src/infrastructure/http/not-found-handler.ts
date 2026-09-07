import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app-error.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route not found: ${req.method} ${req.requestPath}`));
}
