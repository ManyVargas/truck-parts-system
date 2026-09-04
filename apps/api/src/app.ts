import './types/express.js';

import express, { type Router } from 'express';
import helmet from 'helmet';

import { accessRouter } from './features/access/routes.js';
import { healthRouter } from './features/health/routes.js';
import {
  errorHandler,
  notFoundHandler,
  requestIdMiddleware,
  requestLoggingMiddleware,
} from './infrastructure/http/index.js';

export type CreateAppOptions = {
  /** Test-only routers, mounted after feature routes and before the 404 handler. */
  extraRouters?: Array<{ path: string; router: Router }>;
};

/** Matches body-parser's default; bodies over this size map to 413 PAYLOAD_TOO_LARGE. */
export const JSON_BODY_LIMIT_BYTES = 100 * 1024;

export function createApp(options: CreateAppOptions = {}): express.Application {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(requestLoggingMiddleware);
  app.use(express.json({ limit: JSON_BODY_LIMIT_BYTES }));
  app.use('/api/health', healthRouter);
  app.use('/api/auth', accessRouter);

  for (const extraRouter of options.extraRouters ?? []) {
    app.use(extraRouter.path, extraRouter.router);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
