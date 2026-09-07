import { z } from 'zod';

import { DRAFT_META_REQUIRED_MESSAGE } from './constants.js';

export const invoiceIdSchema = z.strictObject({ id: z.uuid() });

export const paginationSchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const invoiceCurrencySchema = z.enum(['DOP', 'USD']);
export const invoiceStatusSchema = z.enum(['DRAFT', 'COMPLETED', 'CANCELLED']);

export const createDraftSchema = z.strictObject({
  customerId: z.uuid().optional(),
  currency: invoiceCurrencySchema.optional(),
  fiscal: z.boolean().optional(),
});

export const updateDraftMetaSchema = createDraftSchema.refine(
  (value) => Object.keys(value).length > 0,
  DRAFT_META_REQUIRED_MESSAGE,
);

export const listInvoicesSchema = paginationSchema.extend({
  status: invoiceStatusSchema.optional(),
});
