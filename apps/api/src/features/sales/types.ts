import type {
  CostProvenance,
  Invoice,
  InvoiceCurrency,
  InvoiceLine,
  InvoiceLineType,
  InvoiceSequence,
  Prisma,
} from '@prisma/client';

export type InvoiceRecord = Invoice & { lines: InvoiceLine[] };

export type CreateDraftInvoiceRecord = {
  customerId: string;
  currency: InvoiceCurrency;
  fiscal: boolean;
};

export type CreateInvoiceLineRecord = {
  invoiceId: string;
  type: InvoiceLineType;
  description: string;
  quantity?: Prisma.Decimal | number | string;
  unitPrice: Prisma.Decimal | number | string;
  acquisitionCostDop?: Prisma.Decimal | number | string | null;
  costProvenance?: CostProvenance | null;
  serviceId?: string | null;
};

export type InvoiceSequenceRecord = InvoiceSequence;
