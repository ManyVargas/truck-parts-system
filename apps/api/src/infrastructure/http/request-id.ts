import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';

function readIncomingRequestId(req: Request): string | undefined {
  const headerValue = req.header(REQUEST_ID_HEADER);

  if (typeof headerValue !== 'string') {
    return undefined;
  }

  const trimmed = headerValue.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = readIncomingRequestId(req) ?? randomUUID();
  req.requestId = requestId;
  req.requestPath = req.path;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
