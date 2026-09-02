/**
 * Operational “today” for demo KPIs (invoices today).
 * Independent of the machine clock so seed numbers stay stable after reset.
 */
export const DEMO_NOW_ISO = '2026-08-25T16:00:00.000Z';

const DEMO_NOW_MS = Date.parse(DEMO_NOW_ISO);
const RUNTIME_STARTED_AT_MS = Date.now();

/** Demo time advances with the running app while preserving the deterministic seed date. */
export function currentDemoTimeIso(): string {
  const elapsedMs = Math.max(0, Date.now() - RUNTIME_STARTED_AT_MS);
  return new Date(DEMO_NOW_MS + elapsedMs).toISOString();
}
