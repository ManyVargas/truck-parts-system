import type { Request, Response } from 'express';

import { AppError } from '../../infrastructure/errors/app-error.js';
import { profitabilityService } from './service.js';

function actor(req: Request): string {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.userId;
}

function invoiceId(req: Request): string {
  return (req.validated?.params as { invoiceId: string }).invoiceId;
}

export async function postManualGrossProfit(req: Request, res: Response) {
  res.json(
    await profitabilityService.recordManualGrossProfit(actor(req), invoiceId(req), req.validated?.body),
  );
}
