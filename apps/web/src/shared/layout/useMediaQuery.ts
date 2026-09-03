import { useEffect, useState } from 'react';

function matchesQuery(query: string, fallback: boolean): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return fallback;
  }

  return window.matchMedia(query).matches;
}

/**
 * Subscribes to a CSS media query. `fallback` is used when `matchMedia` is
 * missing (jsdom tests) — commercial nav defaults to desktop so existing
 * screenshots and tests keep a visible sidebar.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const [matches, setMatches] = useState(() => matchesQuery(query, fallback));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia(query);
    function sync() {
      setMatches(media.matches);
    }

    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [query]);

  return matches;
}
