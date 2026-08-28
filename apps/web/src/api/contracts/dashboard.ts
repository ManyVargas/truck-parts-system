import type { Currency, InvoiceStatus, PaymentState } from './entities';

export type DashboardKpis = {
  availableInventory: number;
  invoicesToday: number;
  outstandingDop: number;
  outstandingUsd: number;
  draftCount: number;
  pendingDismantling: number;
  workOrdersInProgress: number;
  incompleteAssemblies: number;
  /** Administrator-only — omitted from Seller projections. */
  profitDop?: number;
  /** Administrator-only — omitted from Seller projections. */
  pendingFx?: number;
};

export type RecentInvoiceRow = {
  id: string;
  number: string;
  customerName: string;
  status: InvoiceStatus;
  paymentState: PaymentState;
  currency: Currency;
  total: number;
  balance: number;
  confirmedAt?: string;
};

export type ActivityRow = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
};

export type DashboardSnapshot = {
  kpis: DashboardKpis;
  recentInvoices: RecentInvoiceRow[];
  activity: ActivityRow[];
  /** ISO timestamp used as “today” for demo aggregations. */
  demoNowIso: string;
};
