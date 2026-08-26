import express from 'express';

import { healthRouter } from './features/health/routes.js';

export function createApp(): express.Application {
  const app = express();

  app.use(express.json());
  app.use('/api/health', healthRouter);

  return app;
}
