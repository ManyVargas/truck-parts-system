import {
  COMMERCIAL_NAV_COMPACT_MIN_WIDTH_PX,
  COMMERCIAL_NAV_FULL_MIN_WIDTH_PX,
  type CommercialNavMode,
} from './breakpoints';
import { useMediaQuery } from './useMediaQuery';

/** Live nav mode for Admin/Seller. Tests without matchMedia resolve to `full`. */
export function useCommercialNavMode(): CommercialNavMode {
  const isFull = useMediaQuery(`(min-width: ${COMMERCIAL_NAV_FULL_MIN_WIDTH_PX}px)`, true);
  const isAtLeastCompact = useMediaQuery(
    `(min-width: ${COMMERCIAL_NAV_COMPACT_MIN_WIDTH_PX}px)`,
    true,
  );

  if (isFull) {
    return 'full';
  }

  if (isAtLeastCompact) {
    return 'compact';
  }

  return 'drawer';
}
