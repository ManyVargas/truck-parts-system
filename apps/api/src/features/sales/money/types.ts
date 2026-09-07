import type { Prisma } from '@prisma/client';

export const INVOICE_LINE_TYPES = [
  'GENERIC',
  'SERVICE',
  'DELIVERY',
  'EXTERNAL',
  'ITEM',
  'QTY',
] as const;

export type InvoiceLineType = (typeof INVOICE_LINE_TYPES)[number];

export type MoneyInput = Prisma.Decimal | string;

export type LineMoneyInput = {
  type: InvoiceLineType;
  unitPrice: MoneyInput;
  quantity?: MoneyInput;
  fiscal: boolean;
};

export type LineMoney = {
  gross: Prisma.Decimal;
  base: Prisma.Decimal;
  itbis: Prisma.Decimal;
  taxable: boolean;
};

export type RoundedLineMoney = {
  gross: Prisma.Decimal;
  base: Prisma.Decimal;
  itbis: Prisma.Decimal;
};

export type InvoiceMoneyTotals = RoundedLineMoney;

export const COST_PROVENANCES = ['ACTUAL', 'ESTIMATED', 'UNKNOWN'] as const;

export type CostProvenance = (typeof COST_PROVENANCES)[number];

/**
 * Acquisition cost in DOP. UNKNOWN is a first-class state: `amount` is null
 * and must never be treated as zero (profit waits for a later milestone).
 */
export type AcquisitionCost = {
  amount: Prisma.Decimal | null;
  provenance: CostProvenance;
};
