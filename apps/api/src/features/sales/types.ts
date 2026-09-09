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
  Role,
} from '@prisma/client';

export type InvoiceRecord = Invoice & { lines: InvoiceLine[]; customer: Customer };

export type InvoiceListRecord = Invoice & { customer: Customer; lines: InvoiceLine[] };

export type InvoiceViewer = { role: Role };

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

export type CompleteInvoiceLineMoneyRecord = {
  id: string;
  gross: Prisma.Decimal | string;
  base: Prisma.Decimal | string;
  itbis: Prisma.Decimal | string;
};

export type CompleteInvoiceRecord = {
  id: string;
  number: string;
  confirmedAt: Date;
  customerName: string;
  customerRnc: string | null;
  gross: Prisma.Decimal | string;
  base: Prisma.Decimal | string;
  itbis: Prisma.Decimal | string;
  lines: CompleteInvoiceLineMoneyRecord[];
};

export type InvoiceSequenceRecord = InvoiceSequence;

export type InvoiceCustomerView = {
  id: string;
  name: string;
  rnc: string | null;
  isDefault: boolean;
};

export type InvoiceCustomerSnapshot = {
  name: string;
  rnc: string | null;
};

export type RecordUsdFxRateRecord = {
  id: string;
  exchangeRateDopPerUsd: Prisma.Decimal | string;
  source: string;
  rateUpdatedAt: Date;
  obtainedAt: Date;
};

export type PublicFxProvenance = {
  exchangeRateDopPerUsd: string;
  source: string;
  rateUpdatedAt: string;
  obtainedAt: string;
};

export type PublicProfitability = {
  status: 'CALCULATED' | 'UNAVAILABLE' | 'MANUAL';
  reason: 'UNKNOWN_COST' | 'PENDING_FX_RATE' | null;
  profitDop: string | null;
  margin: string | null;
  fx?: PublicFxProvenance;
};

export type RecordManualGrossProfitRecord = {
  id: string;
  profitDop: Prisma.Decimal | string;
  recordedAt: Date;
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
  profitability?: PublicProfitability;
};

export type PublicInvoiceDocument =
  | { status: 'READY' }
  | { status: 'FAILED'; errorId: string };

export type RecordInvoicePdfStatusRecord = {
  id: string;
  status: 'READY' | 'FAILED';
  errorId: string | null;
  generatedAt: Date;
  templateVersion: string;
};

export type InvoicePdfHistorySnapshot = {
  status: 'READY' | 'FAILED';
  errorId: string | null;
  templateVersion: string;
};

export type PublicInvoice = {
  id: string;
  status: InvoiceStatus;
  number: string | null;
  currency: InvoiceCurrency;
  fiscal: boolean;
  customer: InvoiceCustomerView;
  customerSnapshot: InvoiceCustomerSnapshot | null;
  confirmedAt: string | null;
  lines: PublicInvoiceLine[];
  totals: { gross: string; base: string; itbis: string };
  profitability?: PublicProfitability;
  document?: PublicInvoiceDocument;
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
  customerSnapshot: InvoiceCustomerSnapshot | null;
  confirmedAt: string | null;
  profitability?: PublicProfitability;
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

export type InvoiceConfirmedHistorySnapshot = {
  status: 'COMPLETED';
  number: string;
  currency: InvoiceCurrency;
  fiscal: boolean;
  customerId: string;
  customerSnapshot: InvoiceCustomerSnapshot;
  totals: { gross: string; base: string; itbis: string };
  confirmedAt: string;
};

export type InvoiceUsdFxRetryHistorySnapshot = {
  outcome: 'RECORDED' | 'UNAVAILABLE';
  reason: string | null;
  asOf: string;
  after: PublicFxProvenance | null;
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
