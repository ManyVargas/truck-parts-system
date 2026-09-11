import { afterEach, describe, expect, it, vi } from 'vitest';

import { httpProfitabilityRepository as repository } from '../../../src/api/http/repositories';

const calculatedId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const pendingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const unknownId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const cashCustomer = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Cliente contado',
  rnc: null,
  isDefault: true,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function emptySalesPage() {
  return json({ items: [], total: 0, page: 1, pageSize: 10 });
}

function listItem(
  id: string,
  number: string,
  profitability: {
    status: 'CALCULATED' | 'UNAVAILABLE' | 'MANUAL';
    reason: 'UNKNOWN_COST' | 'PENDING_FX_RATE' | null;
    profitDop: string | null;
    margin: string | null;
    fx?: { exchangeRateDopPerUsd: string; source: string; rateUpdatedAt: string; obtainedAt: string };
  },
  extra: {
    confirmedAt?: string;
    payments?: Array<{
      kind: 'PAYMENT' | 'REFUND';
      amount: string;
      method: string;
      effectiveDate: string;
    }>;
  } = {},
) {
  return {
    id,
    status: 'COMPLETED',
    number,
    currency: id === pendingId ? 'USD' : 'DOP',
    customer: cashCustomer,
    confirmedAt: extra.confirmedAt ?? '2026-09-01T16:00:00.000Z',
    totals: { gross: '118.00', base: '100.00', itbis: '18.00' },
    payments: extra.payments ?? [],
    profitability,
  };
}

const calculated = listItem(
  calculatedId,
  'FAC-000001',
  {
    status: 'CALCULATED',
    reason: null,
    profitDop: '50.00',
    margin: '42.37',
  },
  {
    payments: [{ kind: 'PAYMENT', amount: '80.00', method: 'CASH', effectiveDate: '2026-09-01' }],
  },
);

const pending = listItem(pendingId, 'FAC-000002', {
  status: 'UNAVAILABLE',
  reason: 'PENDING_FX_RATE',
  profitDop: null,
  margin: null,
});

const unknown = listItem(unknownId, 'FAC-000003', {
  status: 'UNAVAILABLE',
  reason: 'UNKNOWN_COST',
  profitDop: null,
  margin: null,
});

afterEach(() => vi.unstubAllGlobals());

describe('HTTP profitability contract', () => {
  it('composes the snapshot from completed sales pages and omits seller rows without profit', async () => {
    const fetchMock = vi.fn(async (path: string) => {
      const url = String(path);
      if (url.startsWith('/api/sales?status=CANCELLED')) return emptySalesPage();
      if (url === '/api/sales?status=COMPLETED&page=1&pageSize=10') {
        return json({ items: [calculated, pending], total: 3, page: 1, pageSize: 10 });
      }
      if (url === '/api/sales?status=COMPLETED&page=2&pageSize=10') {
        return json({ items: [unknown], total: 3, page: 2, pageSize: 10 });
      }
      throw new Error(`Unexpected ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await repository.getSnapshot();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.pendingFxCount).toBe(1);
    expect(result.value.profitDop).toBe(50);
    expect(result.value.collectedDop).toBe(80);
    expect(result.value.invoicesMissingProfitCount).toBe(2);
    expect(result.value.charts?.profitByDay.find((point) => point.key === '2026-09-01')?.amount).toBe(
      50,
    );
    expect(result.value.invoices.map((row) => row.number)).toEqual([
      'FAC-000001',
      'FAC-000002',
      'FAC-000003',
    ]);
    expect(result.value.invoices[1]).toMatchObject({
      pendingFx: true,
      profit: null,
      canRecordManual: false,
    });
    expect(result.value.invoices[2]).toMatchObject({
      pendingFx: false,
      profit: null,
      canRecordManual: true,
    });
  });

  it('retries USD profitability and records judged DOP profit with CSRF, then reloads the snapshot', async () => {
    const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
      const url = String(path);
      if (url.includes(`/api/profitability/${pendingId}/retry`) && init?.method === 'POST') {
        expect(new Headers(init.headers).get('X-Requested-With')).toBe('XMLHttpRequest');
        return json({ id: pendingId });
      }
      if (url.includes(`/api/profitability/${unknownId}/manual-gross-profit`) && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({ profitDop: '1800.00' });
        return json({ id: unknownId });
      }
      if (url.startsWith('/api/sales?status=CANCELLED')) return emptySalesPage();
      if (url.startsWith('/api/sales?status=COMPLETED')) {
        return json({
          items: [
            {
              ...pending,
              profitability: {
                status: 'CALCULATED',
                reason: null,
                profitDop: '7177.00',
                margin: '10.00',
                fx: {
                  exchangeRateDopPerUsd: '61.50',
                  source: 'ExchangeRate-API',
                  rateUpdatedAt: '2026-09-09T00:00:00.000Z',
                  obtainedAt: '2026-09-09T13:00:00.000Z',
                },
              },
            },
            {
              ...unknown,
              profitability: {
                status: 'MANUAL',
                reason: null,
                profitDop: '1800.00',
                margin: '15.25',
              },
            },
          ],
          total: 2,
          page: 1,
          pageSize: 10,
        });
      }
      throw new Error(`Unexpected ${path} ${init?.method}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const retried = await repository.retryUsd({ invoiceId: pendingId });
    expect(retried.ok).toBe(true);
    if (retried.ok) {
      expect(retried.value.invoices[0]).toMatchObject({
        number: 'FAC-000002',
        profit: 7177,
        pendingFx: false,
        source: 'CALCULATED',
        rateDopPerUsd: 61.5,
      });
    }

    const recorded = await repository.recordManualGrossProfit({
      invoiceId: unknownId,
      profitDop: 1800,
    });
    expect(recorded.ok).toBe(true);
    if (recorded.ok) {
      expect(recorded.value.invoices[1]).toMatchObject({
        number: 'FAC-000003',
        profit: 1800,
        source: 'MANUAL',
        canRecordManual: true,
      });
      expect(recorded.value.profitDop).toBe(8977);
    }
  });

  it('leaves the demo FX toggle unimplemented', async () => {
    const result = await repository.setFxAvailable({ available: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INTERNAL');
    }
  });
});
