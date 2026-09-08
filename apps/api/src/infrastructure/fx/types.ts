import type { Prisma } from '@prisma/client';

export type FxRateQuote = {
  exchangeRateDopPerUsd: Prisma.Decimal;
  source: string;
  rateUpdatedAt: Date;
  obtainedAt: Date;
};

export type FxRateLookupResult =
  | { ok: true; quote: FxRateQuote }
  | { ok: false; reason: string };

export type FxRateProvider = {
  getUsdToDopRate(): Promise<FxRateLookupResult>;
};
