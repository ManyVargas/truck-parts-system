const HTTP_STATUS_MESSAGE = /^(Error|HTTP)\s+\d{3}\b/i;

/**
 * Page-level load errors should never show raw "HTTP 500" / "Error 500".
 * Specific business messages (validation, permissions) stay intact.
 */
export function toPageLoadMessage(message: string, fallback: string): string {
  const raw = message.trim();
  if (HTTP_STATUS_MESSAGE.test(raw)) {
    return fallback;
  }
  return raw;
}
