import type { Request, Response } from 'express';

import { AppError } from '../../infrastructure/errors/app-error.js';
import { salesService } from './service.js';

function actor(req: Request): string {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.userId;
}

function id(req: Request): string {
  return (req.validated?.params as { id: string }).id;
}

function lineId(req: Request): string {
  return (req.validated?.params as { id: string; lineId: string }).lineId;
}

export async function postDraft(req: Request, res: Response) {
  res.status(201).json(await salesService.createDraft(actor(req), req.validated?.body ?? {}));
}

export async function getInvoices(req: Request, res: Response) {
  res.json(await salesService.list(actor(req), req.validated?.query));
}

export async function getInvoice(req: Request, res: Response) {
  res.json(await salesService.getById(actor(req), id(req)));
}

export async function patchDraft(req: Request, res: Response) {
  res.json(await salesService.updateMeta(actor(req), id(req), req.validated?.body));
}

export async function deleteDraft(req: Request, res: Response) {
  await salesService.discard(actor(req), id(req));
  res.status(204).send();
}

export async function postDraftLine(req: Request, res: Response) {
  res.status(201).json(await salesService.addLine(actor(req), id(req), req.validated?.body));
}

export async function patchDraftLine(req: Request, res: Response) {
  res.json(await salesService.setLinePrice(actor(req), id(req), lineId(req), req.validated?.body));
}

export async function deleteDraftLine(req: Request, res: Response) {
  res.json(await salesService.removeLine(actor(req), id(req), lineId(req)));
}
