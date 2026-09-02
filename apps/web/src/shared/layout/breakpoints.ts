/**
 * Commercial shell layout breakpoints. Values match Tailwind `md` / `xl`
 * so CSS utilities and JS nav mode stay on the same cuts.
 *
 * - full (≥1280): persistent `w-64` sidebar — 1920, 1440, 1366, 1280.
 * - compact (768–1279): narrower persistent sidebar, collapsible — 1024×768.
 * - drawer (<768): overlay navigation — split windows and zoom ~200% of 1280.
 */
export const COMMERCIAL_NAV_FULL_MIN_WIDTH_PX = 1280;
export const COMMERCIAL_NAV_COMPACT_MIN_WIDTH_PX = 768;

export const COMMERCIAL_SIDEBAR_ID = 'commercial-sidebar';

export type CommercialNavMode = 'full' | 'compact' | 'drawer';

export function commercialNavModeForWidth(width: number): CommercialNavMode {
  if (width >= COMMERCIAL_NAV_FULL_MIN_WIDTH_PX) {
    return 'full';
  }

  if (width >= COMMERCIAL_NAV_COMPACT_MIN_WIDTH_PX) {
    return 'compact';
  }

  return 'drawer';
}
