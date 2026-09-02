import type { Request, Response } from 'express';

import { getLivenessStatus, getReadinessStatus } from './service.js';

export function getLive(_req: Request, res: Response): void {
  res.status(200).json(getLivenessStatus());
}

export async function getReady(_req: Request, res: Response): Promise<void> {
  const readiness = await getReadinessStatus();

  if (readiness.status !== 'ok') {
    res.status(503).json(readiness);
    return;
  }

  res.status(200).json(readiness);
}
