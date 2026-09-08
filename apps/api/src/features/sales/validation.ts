import { Prisma } from '@prisma/client';
import { z } from 'zod';

import {
  COST_AMOUNT_REQUIRED_MESSAGE,
  DRAFT_META_REQUIRED_MESSAGE,
  UNKNOWN_COST_AMOUNT_MESSAGE,
} from './constants.js';
import { COST_PROVENANCES, INVOICE_LINE_TYPES } from './money/types.js';

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

export const invoiceLineIdSchema = z.strictObject({
  id: z.uuid(),
  lineId: z.uuid(),
});

export const invoiceLineTypeSchema = z.enum(INVOICE_LINE_TYPES);
export const costProvenanceSchema = z.enum(COST_PROVENANCES);
const moneyStringSchema = z.string();
const DECIMAL_12_2_MAX = new Prisma.Decimal('9999999999.99');
const DECIMAL_12_2_PATTERN = /^\d+(?:\.\d{1,2})?$/;

const decimal12x2StringSchema = z
  .string()
  .trim()
  .superRefine((value, context) => {
    if (!DECIMAL_12_2_PATTERN.test(value)) {
      context.addIssue({
        code: 'custom',
        message: 'Must be a non-negative decimal with at most 2 decimal places',
      });
      return;
    }

    if (new Prisma.Decimal(value).greaterThan(DECIMAL_12_2_MAX)) {
      context.addIssue({
        code: 'custom',
        message: 'Must not exceed 9999999999.99',
      });
    }
  });

const positiveDecimal12x2StringSchema = decimal12x2StringSchema.superRefine((value, context) => {
  if (DECIMAL_12_2_PATTERN.test(value) && new Prisma.Decimal(value).isZero()) {
    context.addIssue({ code: 'custom', message: 'Must be greater than 0' });
  }
});

export const addInvoiceLineSchema = z.strictObject({
  type: invoiceLineTypeSchema,
  description: z.string().trim().min(1).optional(),
  quantity: moneyStringSchema.optional(),
  unitPrice: moneyStringSchema.optional(),
  costProvenance: costProvenanceSchema.optional(),
  acquisitionCostDop: moneyStringSchema.nullable().optional(),
  serviceId: z.uuid().optional(),
});

export const genericDraftLineSchema = z
  .strictObject({
    type: z.literal('GENERIC'),
    description: z.string().trim().min(1),
    quantity: positiveDecimal12x2StringSchema.optional(),
    unitPrice: decimal12x2StringSchema,
    costProvenance: costProvenanceSchema,
    acquisitionCostDop: decimal12x2StringSchema.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.costProvenance === 'UNKNOWN') {
      if (value.acquisitionCostDop != null) {
        context.addIssue({
          code: 'custom',
          message: UNKNOWN_COST_AMOUNT_MESSAGE,
          path: ['acquisitionCostDop'],
        });
      }
      return;
    }
    if (value.acquisitionCostDop == null) {
      context.addIssue({
        code: 'custom',
        message: COST_AMOUNT_REQUIRED_MESSAGE,
        path: ['acquisitionCostDop'],
      });
    }
  });

export const serviceDraftLineSchema = z.strictObject({
  type: z.literal('SERVICE'),
  serviceId: z.uuid(),
  unitPrice: decimal12x2StringSchema,
  description: z.string().trim().min(1).optional(),
});

export const deliveryDraftLineSchema = z.strictObject({
  type: z.literal('DELIVERY'),
  unitPrice: decimal12x2StringSchema,
  description: z.string().trim().min(1),
});

export const setLinePriceSchema = z.strictObject({
  unitPrice: decimal12x2StringSchema,
});
