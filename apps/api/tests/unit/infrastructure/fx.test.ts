import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import {
  EXCHANGE_RATE_API_SOURCE,
  ExchangeRateApiClient,
} from '../../../src/infrastructure/fx/index.js';

const API_KEY = 'test-key-do-not-log';

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

describe('ExchangeRateApiClient', () => {
  it('reads conversion_rate as DOP per 1 USD and does not persist the API key', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain(API_KEY);
      expect(String(url)).toContain('pair/USD/DOP');
      const rateUpdatedAt = new Date('2026-09-08T00:00:00.000Z');
      return jsonResponse({
        result: 'success',
        conversion_rate: 61.5,
        time_last_update_unix: Math.floor(rateUpdatedAt.getTime() / 1000),
        time_last_update_utc: 'Tue, 08 Sep 2026 00:00:00 +0000',
      });
    });
    const obtainedAt = new Date('2026-09-08T12:00:00.000Z');
    const client = new ExchangeRateApiClient({
      apiKey: API_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => obtainedAt,
    });

    const result = await client.getUsdToDopRate();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quote.source).toBe(EXCHANGE_RATE_API_SOURCE);
    expect(result.quote.exchangeRateDopPerUsd.equals(new Prisma.Decimal('61.5'))).toBe(true);
    expect(result.quote.rateUpdatedAt.toISOString()).toBe('2026-09-08T00:00:00.000Z');
    expect(result.quote.obtainedAt).toBe(obtainedAt);
    expect(JSON.stringify(result.quote)).not.toContain(API_KEY);
  });

  it('returns unavailable for missing key, quota-reached, invalid-key, and invalid payload', async () => {
    const missing = await new ExchangeRateApiClient({ apiKey: undefined }).getUsdToDopRate();
    expect(missing).toEqual({ ok: false, reason: 'missing-api-key' });

    const quota = await new ExchangeRateApiClient({
      apiKey: API_KEY,
      fetchImpl: async () => jsonResponse({ result: 'error', 'error-type': 'quota-reached' }, false),
    }).getUsdToDopRate();
    expect(quota).toEqual({ ok: false, reason: 'quota-reached' });

    const invalidKey = await new ExchangeRateApiClient({
      apiKey: API_KEY,
      fetchImpl: async () => jsonResponse({ result: 'error', 'error-type': 'invalid-key' }, false),
    }).getUsdToDopRate();
    expect(invalidKey).toEqual({ ok: false, reason: 'invalid-key' });

    const invertedWouldBeWrong = await new ExchangeRateApiClient({
      apiKey: API_KEY,
      fetchImpl: async () =>
        jsonResponse({
          result: 'success',
          conversion_rate: 0,
          time_last_update_unix: 1_757_289_600,
        }),
    }).getUsdToDopRate();
    expect(invertedWouldBeWrong.ok).toBe(false);
  });

  it('maps a hung request to timeout without inventing a rate', async () => {
    const client = new ExchangeRateApiClient({
      apiKey: API_KEY,
      timeoutMs: 20,
      fetchImpl: async (_url, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('timeout');
            error.name = 'TimeoutError';
            reject(error);
          });
        }),
    });
    const result = await client.getUsdToDopRate();
    expect(result).toEqual({ ok: false, reason: 'timeout' });
  });

  it('reads historical conversion_rates.DOP for the UTC day and does not use pair/live', async () => {
    const asOf = new Date('2026-09-08T18:30:00.000Z');
    const fetchImpl = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain('history/USD/2026/9/8');
      expect(String(url)).not.toContain('pair/USD/DOP');
      return jsonResponse({
        result: 'success',
        year: 2026,
        month: 9,
        day: 8,
        base_code: 'USD',
        conversion_rates: { DOP: 61.5, EUR: 0.85 },
      });
    });
    const obtainedAt = new Date('2026-09-09T12:00:00.000Z');
    const client = new ExchangeRateApiClient({
      apiKey: API_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => obtainedAt,
    });

    const result = await client.getUsdToDopRate({ asOf });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quote.exchangeRateDopPerUsd.equals(new Prisma.Decimal('61.5'))).toBe(true);
    expect(result.quote.rateUpdatedAt.toISOString()).toBe('2026-09-08T00:00:00.000Z');
    expect(result.quote.obtainedAt).toBe(obtainedAt);
    expect(JSON.stringify(result.quote)).not.toContain(API_KEY);
  });

  it('does not persist a live conversion_rate when historical lookup is required', async () => {
    const client = new ExchangeRateApiClient({
      apiKey: API_KEY,
      fetchImpl: async () =>
        jsonResponse({
          result: 'success',
          conversion_rate: 99.99,
          time_last_update_unix: 1_757_289_600,
        }),
    });
    const result = await client.getUsdToDopRate({ asOf: new Date('2026-09-08T18:00:00.000Z') });
    expect(result).toEqual({ ok: false, reason: 'invalid-payload' });
  });

  it('maps plan-upgrade-required to unavailable without inventing a rate', async () => {
    const client = new ExchangeRateApiClient({
      apiKey: API_KEY,
      fetchImpl: async () =>
        jsonResponse({ result: 'error', 'error-type': 'plan-upgrade-required' }, false),
    });
    const result = await client.getUsdToDopRate({ asOf: new Date('2026-09-08T18:00:00.000Z') });
    expect(result).toEqual({ ok: false, reason: 'plan-upgrade-required' });
  });
});
