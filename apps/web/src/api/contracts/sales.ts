import type {
  AppEvent,
  Currency,
  InvoiceStatus,
  LineType,
  PaymentKind,
  PaymentMethod,
  PaymentState,
  WorkOrderStatus,
  WorkOrderType,
} from './entities';

export type SalesListTab = 'ALL' | 'DRAFT' | 'COMPLETED' | 'CANCELLED';

export type SalesListRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  paymentState: PaymentState;
  customerId: string;
  customerName: string;
  currency: Currency;
  fiscal: boolean;
  total: number;
  balance: number;
  createdAt: string;
  confirmedAt?: string;
  href: string;
};

export type InvoiceLineView = {
  id: string;
  type: LineType;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  gross: number;
  base: number;
  itbis: number;
};

export type PaymentView = {
  id: string;
  kind: PaymentKind;
  amount: number;
  method: PaymentMethod;
  createdAt: string;
  reference?: string;
};

export type LinkedWorkOrderView = {
  id: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  pieceId: string;
  pieceName: string;
};

export type InvoiceHistoryEntry = {
  id: string;
  type: AppEvent['type'];
  description: string;
  createdAt: string;
  actorName?: string;
};

export type InvoiceProfitabilityView = {
  currency: Currency;
  profit: number | null;
  pendingFx: boolean;
  reason?: string;
};

export type InvoiceDetailActions = {
  canPay: boolean;
  canCancel: boolean;
  canCorrectCurrency: boolean;
  canViewPdf: boolean;
};

export type InvoiceDetailView = {
  id: string;
  number?: string;
  status: InvoiceStatus;
  paymentState: PaymentState;
  customerId: string;
  customerName: string;
  customerRnc?: string;
  currency: Currency;
  fiscal: boolean;
  lines: InvoiceLineView[];
  payments: PaymentView[];
  total: number;
  paid: number;
  refunded: number;
  balance: number;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  linkedWorkOrders: LinkedWorkOrderView[];
  history: InvoiceHistoryEntry[];
  profitability?: InvoiceProfitabilityView;
  actions: InvoiceDetailActions;
};

export type AddPaymentInput = {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  idempotencyKey?: string;
};

export type InProgressCancelDecision = 'STOP' | 'CONTINUE';

export type CancelInvoiceInput = {
  invoiceId: string;
  reason: string;
  refundAmount?: number;
  refundMethod?: PaymentMethod;
  inProgressDecision?: InProgressCancelDecision;
};

export type CorrectCurrencyInput = {
  invoiceId: string;
  currency: Currency;
  reason: string;
};
