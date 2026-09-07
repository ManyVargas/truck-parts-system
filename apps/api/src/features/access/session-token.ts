import { createHash, randomBytes } from 'node:crypto';

import { SESSION_TOKEN_BYTES } from './constants.js';

export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('hex');
}

// Hash the cookie value as UTF-8 hex so lookup always matches what was persisted.
export function hashSessionToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}
