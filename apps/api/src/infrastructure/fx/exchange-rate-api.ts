import { Prisma } from '@prisma/client';

import { logger } from '../logging/index.js';
import {
  EXCHANGE_RATE_API_BASE_URL,
  EXCHANGE_RATE_API_PAIR_PATH,
  EXCHANGE_RATE_API_SOURCE,
  EXCHANGE_RATE_API_TIMEOUT_MS,
} from './constants.js';
import type { FxRateLookupResult, FxRateProvider, FxRateQuote } from './types.js';

type ExchangeRateApiClientOptions = {
  apiKey: string | undefined;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

type ExchangeRateApiPayload = {
  result?: unknown;
  'error-type'?: unknown;
  conversion_rate?: unknown;
  time_last_update_unix?: unknown;
  time_last_update_utc?: unknown;
};

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

function redactSecret(text: string, secret: string): string {
  return text.split(secret).join('[Redacted]');
}

function asRecord(value: unknown): ExchangeRateApiPayload | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as ExchangeRateApiPayload;
}

function parsePositiveRate(value: unknown): Prisma.Decimal | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    return new Prisma.Decimal(String(value));
  }
  if (typeof value === 'string') {
    try {
      const parsed = new Prisma.Decimal(value.trim());
      if (!parsed.isFinite() || parsed.lte(0)) return null;
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

function parseRateUpdatedAt(payload: ExchangeRateApiPayload): Date | null {
  if (typeof payload.time_last_update_unix === 'number' && Number.isFinite(payload.time_last_update_unix)) {
    return new Date(payload.time_last_update_unix * 1000);
  }
  if (typeof payload.time_last_update_utc === 'string') {
    const parsed = new Date(payload.time_last_update_utc);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export class ExchangeRateApiClient implements FxRateProvider {
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(options: ExchangeRateApiClientOptions) {
    this.apiKey = options.apiKey?.trim() || undefined;
    this.timeoutMs = options.timeoutMs ?? EXCHANGE_RATE_API_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async getUsdToDopRate(): Promise<FxRateLookupResult> {
    if (!this.apiKey) {
      return { ok: false, reason: 'missing-api-key' };
    }

    const url = `${EXCHANGE_RATE_API_BASE_URL}/${this.apiKey}/${EXCHANGE_RATE_API_PAIR_PATH}`;
    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const payload = asRecord(await response.json());
      return this.parsePayload(payload);
    } catch (error) {
      if (isTimeoutError(error)) {
        return { ok: false, reason: 'timeout' };
      }
      const message = error instanceof Error ? redactSecret(error.message, this.apiKey) : 'http-error';
      logger.warn({ reason: message }, 'ExchangeRate-API lookup failed');
      return { ok: false, reason: 'http-error' };
    }
  }

  private parsePayload(payload: ExchangeRateApiPayload | null): FxRateLookupResult {
    if (payload == null) {
      return { ok: false, reason: 'invalid-payload' };
    }
    if (payload.result !== 'success') {
      const errorType = typeof payload['error-type'] === 'string' ? payload['error-type'] : 'error';
      return { ok: false, reason: errorType };
    }

    const rate = parsePositiveRate(payload.conversion_rate);
    const rateUpdatedAt = parseRateUpdatedAt(payload);
    if (rate == null || rateUpdatedAt == null) {
      return { ok: false, reason: 'invalid-payload' };
    }

    const quote: FxRateQuote = {
      exchangeRateDopPerUsd: rate,
      source: EXCHANGE_RATE_API_SOURCE,
      rateUpdatedAt,
      obtainedAt: this.now(),
    };
    return { ok: true, quote };
  }
}
