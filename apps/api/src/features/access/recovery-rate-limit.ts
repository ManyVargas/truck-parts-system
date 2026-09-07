import { MemoryStore, rateLimit } from 'express-rate-limit';

import { AppError } from '../../infrastructure/errors/app-error.js';
import { RECOVERY_RATE_LIMIT_MAX_ATTEMPTS, RECOVERY_RATE_LIMIT_WINDOW_MS } from './constants.js';

const store = new MemoryStore();
export const recoveryRateLimiter = rateLimit({
  windowMs: RECOVERY_RATE_LIMIT_WINDOW_MS,
  limit: RECOVERY_RATE_LIMIT_MAX_ATTEMPTS,
  store,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(AppError.tooManyRequests()),
});
export async function resetRecoveryRateLimit(): Promise<void> {
  await store.resetAll();
}
