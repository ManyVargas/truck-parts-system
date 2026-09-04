import { rateLimit, MemoryStore } from 'express-rate-limit';

import { AppError } from '../../infrastructure/errors/app-error.js';
import { LOGIN_RATE_LIMIT_MAX_ATTEMPTS, LOGIN_RATE_LIMIT_WINDOW_MS } from './constants.js';

const loginRateLimitStore = new MemoryStore();

export const loginRateLimiter = rateLimit({
  windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
  limit: LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  store: loginRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  // Tests and local clients may send X-Forwarded-For; key by Express req.ip instead.
  validate: { xForwardedForHeader: false },
  handler: (_req, _res, next) => {
    next(AppError.tooManyRequests());
  },
});

export async function resetLoginRateLimit(): Promise<void> {
  await loginRateLimitStore.resetAll();
}
