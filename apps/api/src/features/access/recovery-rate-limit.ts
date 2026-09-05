import { MemoryStore, rateLimit } from 'express-rate-limit';

import { AppError } from '../../infrastructure/errors/app-error.js';

const store = new MemoryStore();
export const recoveryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  store,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (_req, _res, next) => next(AppError.tooManyRequests()),
});
export async function resetRecoveryRateLimit(): Promise<void> {
  await store.resetAll();
}
