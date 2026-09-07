import { Router } from 'express';

import { validate } from '../../infrastructure/http/validate.js';
import { requireAuth } from '../access/require-auth.js';
import { requireCsrfHeader } from '../access/require-csrf.js';
import { requireRole } from '../access/require-role.js';
import { deleteDraft, getInvoice, getInvoices, patchDraft, postDraft } from './controller.js';
import { createDraftSchema, invoiceIdSchema, listInvoicesSchema, updateDraftMetaSchema } from './validation.js';

export const salesRouter = Router();
salesRouter.use(requireAuth, requireRole('ADMINISTRATOR', 'SELLER'));
salesRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
salesRouter.get('/', validate({ query: listInvoicesSchema }), getInvoices);
salesRouter.get('/:id', validate({ params: invoiceIdSchema }), getInvoice);
salesRouter.post('/', requireCsrfHeader, validate({ body: createDraftSchema }), postDraft);
salesRouter.patch(
  '/:id',
  requireCsrfHeader,
  validate({ params: invoiceIdSchema, body: updateDraftMetaSchema }),
  patchDraft,
);
salesRouter.delete(
  '/:id',
  requireCsrfHeader,
  validate({ params: invoiceIdSchema }),
  deleteDraft,
);
