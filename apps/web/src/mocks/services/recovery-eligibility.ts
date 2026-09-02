import type { Invoice } from '../../api/contracts/entities';
import { ABANDONED_DRAFT_AFTER_HOURS } from '../../api/contracts/recovery';
import { currentDemoTimeIso } from '../data/demo-clock';

const ABANDONED_DRAFT_AFTER_MS = ABANDONED_DRAFT_AFTER_HOURS * 60 * 60 * 1_000;

/**
 * A Draft becomes eligible for named administrative recovery six hours after creation.
 * This classification never expires or releases the Draft automatically.
 */
export function isAbandonedDraft(
  invoice: Pick<Invoice, 'status' | 'createdAt'>,
  nowIso = currentDemoTimeIso(),
): boolean {
  if (invoice.status !== 'DRAFT') {
    return false;
  }

  const createdAt = Date.parse(invoice.createdAt);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(createdAt) || !Number.isFinite(now)) {
    return false;
  }

  return now - createdAt >= ABANDONED_DRAFT_AFTER_MS;
}
