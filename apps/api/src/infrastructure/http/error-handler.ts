import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { mapErrorToHttp } from '../errors/map-error.js';
import { logger } from '../logging/logger.js';

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const errorId = randomUUID();
  const mapped = mapErrorToHttp(error, errorId);

  if (mapped.isUnexpected) {
    logger.error(
      {
        requestId: req.requestId,
        errorId,
        err: error,
        method: req.method,
        path: req.requestPath,
      },
      'unexpected request failure',
    );
  }

  res.status(mapped.status).json(mapped.body);
}
