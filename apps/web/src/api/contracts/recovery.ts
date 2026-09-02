import type { Currency } from './entities';

/** Minimum Draft age before named administrative recovery is allowed. */
export const ABANDONED_DRAFT_AFTER_HOURS = 6;

export type AbandonedReservationRow = {
  draftId: string;
  customerName: string;
  createdAt: string;
  reservedItemIds: string[];
  reservedQtyProductIds: string[];
  href: string;
};

export type PendingFxRecoveryRow = {
  invoiceId: string;
  number: string;
  currency: Currency;
  href: string;
};

export type RecoveryQuickLink = {
  id: string;
  label: string;
  href: string;
  description: string;
};

export type RecoveryDiagnosticRow = {
  id: string;
  label: string;
  count: number;
  hint: string;
};

export type RecoverySnapshot = {
  abandonedReservations: AbandonedReservationRow[];
  pendingFx: PendingFxRecoveryRow[];
  diagnostics: RecoveryDiagnosticRow[];
  quickLinks: RecoveryQuickLink[];
};

export type ReleaseReservationInput = {
  draftId: string;
  reason: string;
};

export type ReleaseReservationResult = {
  draftId: string;
  releasedItemIds: string[];
};
