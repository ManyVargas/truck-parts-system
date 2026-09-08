import type {
  CostProvenance,
  Customer,
  Invoice,
  InvoiceCurrency,
  InvoiceLine,
  InvoiceLineType,
  InvoiceSequence,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';

export type InvoiceRecord = Invoice & { lines: InvoiceLine[]; customer: Customer };

export type InvoiceListRecord = Invoice & { customer: Customer };

export type CreateDraftInvoiceRecord = {
  customerId: string;
  currency: InvoiceCurrency;
  fiscal: boolean;
};

export type UpdateDraftInvoiceRecord = {
  customerId?: string;
  currency?: InvoiceCurrency;
  fiscal?: boolean;
};

export type ListInvoicesQuery = {
  status?: InvoiceStatus;
  page: number;
  pageSize: number;
};

export type CreateInvoiceLineRecord = {
  invoiceId: string;
  type: InvoiceLineType;
  description: string;
  quantity?: Prisma.Decimal | string;
  unitPrice: Prisma.Decimal | string;
  acquisitionCostDop?: Prisma.Decimal | string | null;
  costProvenance?: CostProvenance | null;
  serviceId?: string | null;
};

export type UpdateInvoiceLinePriceRecord = {
  invoiceId: string;
  lineId: string;
  unitPrice: Prisma.Decimal | string;
};

export type InvoiceSequenceRecord = InvoiceSequence;

export type InvoiceCustomerView = {
  id: string;
  name: string;
  rnc: string | null;
  isDefault: boolean;
};

export type PublicInvoiceLine = {
  id: string;
  type: InvoiceLineType;
  description: string;
  quantity: string;
  unitPrice: string;
  taxable: boolean;
  gross: string;
  base: string;
  itbis: string;
  acquisitionCostDop: string | null;
  costProvenance: CostProvenance | null;
  serviceId: string | null;
};

export type PublicInvoice = {
  id: string;
  status: InvoiceStatus;
  number: string | null;
  currency: InvoiceCurrency;
  fiscal: boolean;
  customer: InvoiceCustomerView;
  lines: PublicInvoiceLine[];
  totals: { gross: string; base: string; itbis: string };
  createdAt: string;
  updatedAt: string;
};

export type PublicInvoiceListItem = {
  id: string;
  status: InvoiceStatus;
  number: string | null;
  currency: InvoiceCurrency;
  fiscal: boolean;
  customer: InvoiceCustomerView;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceDraftHistorySnapshot = {
  status: 'DRAFT';
  number: null;
  currency: InvoiceCurrency;
  fiscal: boolean;
  customerId: string;
};

export type InvoiceLineHistorySnapshot = {
  id: string;
  type: InvoiceLineType;
  description: string;
  quantity: string;
  unitPrice: string;
  acquisitionCostDop: string | null;
  costProvenance: CostProvenance | null;
  serviceId: string | null;
};
