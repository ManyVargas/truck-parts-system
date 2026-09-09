import { afterEach, describe, expect, it, vi } from 'vitest';

import { httpSalesRepository as repository } from '../../../src/api/http/repositories';
import { toHttpAddLineBody } from '../../../src/api/client/sales-api';

const cashCustomer = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Cliente contado',
  rnc: null,
  isDefault: true,
};

const installation = {
  id: '55555555-5555-4555-8555-555555555555',
  name: 'Instalación',
  description: null,
  active: true,
  createdAt: '2026-09-07T01:00:00.000Z',
  updatedAt: '2026-09-07T01:00:00.000Z',
};

const draftId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const lineId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const emptyInvoice = {
  id: draftId,
  status: 'DRAFT',
  number: null,
  currency: 'DOP',
  fiscal: false,
  customer: cashCustomer,
  customerSnapshot: null,
  confirmedAt: null,
  lines: [],
  totals: { gross: '0.00', base: '0.00', itbis: '0.00' },
  createdAt: '2026-09-09T12:00:00.000Z',
  updatedAt: '2026-09-09T12:00:00.000Z',
};

const invoiceWithTotal = {
  ...emptyInvoice,
  totals: { gross: '118.00', base: '100.00', itbis: '18.00' },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => vi.unstubAllGlobals());

describe('HTTP sales draft contract', () => {
  it('lists only drafts and maps a missing number', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      json({
        items: [invoiceWithTotal],
        total: 1,
        page: 1,
        pageSize: 100,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const all = await repository.listInvoices('ALL');
    expect(all).toMatchObject({
      ok: true,
      value: [
        {
          id: draftId,
          number: `Borrador ${draftId}`,
          status: 'DRAFT',
          href: `/sales/draft/${draftId}`,
          total: 118,
        },
      ],
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/sales?status=DRAFT&page=1&pageSize=100');

    fetchMock.mockClear();
    expect(await repository.listInvoices('COMPLETED')).toEqual({ ok: true, value: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates a draft with CSRF and loads lookups on getDraft', async () => {
    const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
      const url = String(path);
      if (url === '/api/sales' && init?.method === 'POST') return json(emptyInvoice, 201);
      if (url === `/api/sales/${draftId}` && !init?.method) return json(emptyInvoice);
      if (url.startsWith('/api/customers?')) {
        return json({
          items: [{ ...cashCustomer, address: null, notes: null, contacts: [] }],
          total: 1,
          page: 1,
          pageSize: 100,
        });
      }
      if (url === '/api/catalogs/services') return json({ items: [installation] });
      throw new Error(`Unexpected ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    expect(await repository.createDraft()).toEqual({ ok: true, value: { draftId } });
    const createInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(createInit.headers).get('X-Requested-With')).toBe('XMLHttpRequest');

    const draft = await repository.getDraft(draftId);
    expect(draft).toMatchObject({
      ok: true,
      value: {
        id: draftId,
        customerIsDefault: true,
        currency: 'DOP',
        items: [],
        qtyProducts: [],
        blockers: [],
        services: [{ id: installation.id, name: 'Instalación' }],
      },
    });
  });

  it('sends GENERIC unknown cost and EXTERNAL actual cost as decimal strings', () => {
    expect(
      toHttpAddLineBody({
        draftId,
        type: 'GENERIC',
        description: 'Filtro',
        quantity: 2,
        unitPrice: 100,
        notes: '  En bahía  ',
      }),
    ).toEqual({
      type: 'GENERIC',
      description: 'Filtro',
      unitPrice: '100.00',
      quantity: '2.00',
      costProvenance: 'UNKNOWN',
      notes: 'En bahía',
    });
    expect(
      toHttpAddLineBody({
        draftId,
        type: 'EXTERNAL',
        description: 'Bomba',
        unitPrice: 50,
        acquisitionCostDop: 20,
      }),
    ).toEqual({
      type: 'EXTERNAL',
      description: 'Bomba',
      unitPrice: '50.00',
      costProvenance: 'ACTUAL',
      acquisitionCostDop: '20.00',
    });
    expect(
      toHttpAddLineBody({
        draftId,
        type: 'DELIVERY',
        unitPrice: 0,
      }),
    ).toEqual({
      type: 'DELIVERY',
      description: 'Entrega',
      unitPrice: '0.00',
    });
    expect(toHttpAddLineBody({ draftId, type: 'ITEM', itemId: 'x' })).toEqual({ type: 'ITEM' });
  });

  it('adds a GENERIC line and discards with DELETE', async () => {
    const withLine = {
      ...emptyInvoice,
      lines: [
        {
          id: lineId,
          type: 'GENERIC',
          description: 'Filtro',
          quantity: '1.00',
          unitPrice: '100.00',
          taxable: true,
          gross: '100.00',
          base: '100.00',
          itbis: '0.00',
          acquisitionCostDop: null,
          costProvenance: 'UNKNOWN',
          serviceId: null,
        },
      ],
      totals: { gross: '100.00', base: '100.00', itbis: '0.00' },
    };
    const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
      const url = String(path);
      if (url === `/api/sales/${draftId}/lines` && init?.method === 'POST')
        return json(withLine, 201);
      if (url === `/api/sales/${draftId}` && init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      if (url.startsWith('/api/customers?')) {
        return json({
          items: [{ ...cashCustomer, address: null, notes: null, contacts: [] }],
          total: 1,
          page: 1,
          pageSize: 100,
        });
      }
      if (url === '/api/catalogs/services') return json({ items: [installation] });
      throw new Error(`Unexpected ${path} ${init?.method}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const added = await repository.addLine({
      draftId,
      type: 'GENERIC',
      description: 'Filtro',
      unitPrice: 100,
      quantity: 1,
    });
    expect(added.ok).toBe(true);
    if (added.ok) {
      expect(added.value.lines[0]?.description).toBe('Filtro');
      expect(added.value.totals.gross).toBe(100);
    }
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toMatchObject({
      type: 'GENERIC',
      costProvenance: 'UNKNOWN',
      unitPrice: '100.00',
    });

    expect(await repository.discardDraft(draftId)).toEqual({ ok: true, value: undefined });
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
  });

  it('updates all editable line fields in one PATCH', async () => {
    const updatedInvoice = {
      ...invoiceWithTotal,
      lines: [
        {
          id: lineId,
          type: 'GENERIC',
          description: 'Filtro de aire',
          notes: 'Para motor',
          quantity: '3.00',
          unitPrice: '125.00',
          taxable: true,
          gross: '375.00',
          base: '375.00',
          itbis: '0.00',
          acquisitionCostDop: '40.00',
          costProvenance: 'ACTUAL',
          serviceId: null,
        },
      ],
    };
    const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
      if (String(path) === `/api/sales/${draftId}/lines/${lineId}` && init?.method === 'PATCH') {
        return json(updatedInvoice);
      }
      if (String(path).startsWith('/api/customers?')) {
        return json({
          items: [{ ...cashCustomer, address: null, notes: null, contacts: [] }],
          total: 1,
          page: 1,
          pageSize: 100,
        });
      }
      if (String(path) === '/api/catalogs/services') return json({ items: [installation] });
      throw new Error(`Unexpected ${path} ${init?.method}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await repository.setLinePrice({
      draftId,
      lineId,
      unitPrice: 125,
      quantity: 3,
      description: ' Filtro de aire ',
      notes: ' Para motor ',
      acquisitionCostDop: 40,
    });

    expect(result.ok).toBe(true);
    const patchCalls = fetchMock.mock.calls.filter(
      ([path, init]) =>
        String(path) === `/api/sales/${draftId}/lines/${lineId}` && init?.method === 'PATCH',
    );
    expect(patchCalls).toHaveLength(1);
    expect(JSON.parse(String((patchCalls[0]?.[1] as RequestInit).body))).toEqual({
      unitPrice: '125.00',
      quantity: '3.00',
      description: 'Filtro de aire',
      notes: 'Para motor',
      acquisitionCostDop: '40.00',
    });
  });

  it('keeps a successful line mutation successful when auxiliary lookups fail', async () => {
    const withLine = {
      ...invoiceWithTotal,
      lines: [
        {
          id: lineId,
          type: 'GENERIC',
          description: 'Filtro',
          quantity: '1.00',
          unitPrice: '118.00',
          taxable: true,
          gross: '118.00',
          base: '100.00',
          itbis: '18.00',
          acquisitionCostDop: null,
          costProvenance: 'UNKNOWN',
          serviceId: null,
        },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, init?: RequestInit) => {
        if (String(path) === `/api/sales/${draftId}/lines` && init?.method === 'POST') {
          return json(withLine, 201);
        }
        return json({ error: { code: 'INTERNAL' } }, 503);
      }),
    );

    const result = await repository.addLine({
      draftId,
      type: 'GENERIC',
      description: 'Filtro',
      unitPrice: 118,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        customerId: cashCustomer.id,
        totals: { gross: 118 },
        customers: [{ id: cashCustomer.id }],
      },
    });
  });

  it('translates a fiscal identity conflict', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json(
          {
            error: {
              code: 'CONFLICT',
              message: 'A fiscal invoice requires a customer with RNC or Cédula',
            },
          },
          409,
        ),
      ),
    );

    const result = await repository.setDraftMeta({ draftId, fiscal: true });
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Una factura fiscal requiere un cliente con RNC o cédula.',
      },
    });
  });

  it('leaves confirmation unimplemented', async () => {
    expect(await repository.confirmInvoice(draftId)).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL' },
    });
  });
});
