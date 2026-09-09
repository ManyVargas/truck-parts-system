// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => vi.stubEnv('VITE_USE_MOCK_API', 'false'));

import { router as appRouter } from '../../../src/router';
import { AuthProvider } from '../../../src/features/auth/AuthContext';
import { CapabilitiesProvider } from '../../../src/shared/config/CapabilitiesProvider';
import { ToastProvider, Toaster } from '../../../src/shared/ui';
import type { Role } from '../../../src/api/contracts/entities';
import '../../support/dom';

const cashCustomer = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Cliente contado',
  rnc: null,
  address: null,
  notes: null,
  isDefault: true,
  contacts: [],
  createdAt: '2026-09-07T01:00:00.000Z',
  updatedAt: '2026-09-07T01:00:00.000Z',
};

const installation = {
  id: '55555555-5555-4555-8555-555555555555',
  name: 'Instalación mecánica',
  description: null,
  active: true,
  createdAt: '2026-09-07T01:00:00.000Z',
  updatedAt: '2026-09-07T01:00:00.000Z',
};

const draftId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

type ApiLine = {
  id: string;
  type: string;
  description: string;
  notes: string | null;
  quantity: string;
  unitPrice: string;
  taxable: boolean;
  gross: string;
  base: string;
  itbis: string;
  acquisitionCostDop: string | null;
  costProvenance: string | null;
  serviceId: string | null;
};

type ApiInvoice = {
  id: string;
  status: 'DRAFT';
  number: null;
  currency: 'DOP' | 'USD';
  fiscal: boolean;
  customer: { id: string; name: string; rnc: string | null; isDefault: boolean };
  customerSnapshot: null;
  confirmedAt: null;
  lines: ApiLine[];
  totals: { gross: string; base: string; itbis: string };
  createdAt: string;
  updatedAt: string;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function identity(role: Role) {
  return {
    id: `${role.toLowerCase()}-id`,
    name: role,
    username: role.toLowerCase(),
    role,
    mustChangePassword: false,
    active: true,
    phone: null,
    email: null,
    createdAt: '2026-09-07T01:00:00.000Z',
    updatedAt: '2026-09-07T01:00:00.000Z',
  };
}

function emptyInvoice(): ApiInvoice {
  return {
    id: draftId,
    status: 'DRAFT',
    number: null,
    currency: 'DOP',
    fiscal: false,
    customer: {
      id: cashCustomer.id,
      name: cashCustomer.name,
      rnc: cashCustomer.rnc,
      isDefault: true,
    },
    customerSnapshot: null,
    confirmedAt: null,
    lines: [],
    totals: { gross: '0.00', base: '0.00', itbis: '0.00' },
    createdAt: '2026-09-09T12:00:00.000Z',
    updatedAt: '2026-09-09T12:00:00.000Z',
  };
}

function sumGross(lines: ApiLine[]): string {
  const total = lines.reduce((sum, line) => sum + Number(line.gross), 0);
  return total.toFixed(2);
}

let role: Role;
let invoice: ApiInvoice | null;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  role = 'SELLER';
  invoice = null;
  fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
    const url = String(path);
    if (path === '/api/auth/session' || path === '/api/auth/me') return json(identity(role));
    if (url.startsWith('/api/customers?') && !init?.method) {
      return json({ items: [cashCustomer], total: 1, page: 1, pageSize: 100 });
    }
    if (url === '/api/catalogs/services') return json({ items: [installation] });
    if (url.startsWith('/api/sales?status=DRAFT')) {
      const items = invoice ? [invoice] : [];
      return json({ items, total: items.length, page: 1, pageSize: 100 });
    }
    if (url === '/api/sales' && init?.method === 'POST') {
      invoice = emptyInvoice();
      return json(invoice, 201);
    }
    if (url === `/api/sales/${draftId}` && init?.method === 'PATCH') {
      const body = JSON.parse(init.body as string);
      if (!invoice) return json({ error: { code: 'NOT_FOUND' } }, 404);
      if (body.fiscal === true && (invoice.customer.isDefault || !invoice.customer.rnc)) {
        return json(
          {
            error: {
              code: 'CONFLICT',
              message: 'A fiscal invoice requires a customer with RNC or Cédula',
            },
          },
          409,
        );
      }
      invoice = { ...invoice, ...body };
      return json(invoice);
    }
    if (url === `/api/sales/${draftId}` && init?.method === 'DELETE') {
      invoice = null;
      return new Response(null, { status: 204 });
    }
    if (url === `/api/sales/${draftId}` && !init?.method) {
      if (!invoice) return json({ error: { code: 'NOT_FOUND' } }, 404);
      return json(invoice);
    }
    if (url === `/api/sales/${draftId}/lines` && init?.method === 'POST') {
      if (!invoice) return json({ error: { code: 'NOT_FOUND' } }, 404);
      const body = JSON.parse(init.body as string);
      const line: ApiLine = {
        id: `line-${invoice.lines.length + 1}`,
        type: body.type,
        description: body.description ?? installation.name,
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        quantity: body.quantity ?? '1.00',
        unitPrice: body.unitPrice ?? '0.00',
        taxable: body.type === 'GENERIC' || body.type === 'EXTERNAL',
        gross: body.unitPrice ?? '0.00',
        base: body.unitPrice ?? '0.00',
        itbis: '0.00',
        acquisitionCostDop: body.acquisitionCostDop ?? null,
        costProvenance: body.costProvenance ?? null,
        serviceId: body.serviceId ?? null,
      };
      invoice = {
        ...invoice,
        lines: [...invoice.lines, line],
        totals: { ...invoice.totals, gross: sumGross([...invoice.lines, line]) },
      };
      return json(invoice, 201);
    }
    if (url === `/api/sales/${draftId}/confirm`) {
      throw new Error('confirm must not be called in M21');
    }
    throw new Error(`Unexpected endpoint: ${path} ${init?.method ?? 'GET'}`);
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

function mount(path = '/sales') {
  const router = createMemoryRouter(appRouter.routes, { initialEntries: [path] });
  render(
    <ToastProvider>
      <AuthProvider>
        <CapabilitiesProvider>
          <RouterProvider router={router} />
          <Toaster />
        </CapabilitiesProvider>
      </AuthProvider>
    </ToastProvider>,
  );
}

describe('M21 HTTP POS draft UI', () => {
  it('lets a seller create a draft with the four R2 lines, change currency, and discard', async () => {
    const user = userEvent.setup();
    mount();

    expect(await screen.findByRole('heading', { name: 'Ventas y Facturas' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Inicio' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nuevo borrador' }));

    expect(await screen.findByRole('heading', { name: 'Punto de venta' })).toBeVisible();
    expect(screen.getByLabelText('Cliente')).toHaveDisplayValue(/Cliente contado/);
    expect(screen.getByRole('checkbox')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Agregar línea' }));
    const typeSelect = await screen.findByLabelText('Tipo de línea');
    expect(within(typeSelect).getByRole('option', { name: 'Mercancía genérica' })).toBeInTheDocument();
    expect(within(typeSelect).getByRole('option', { name: 'Reventa externa' })).toBeInTheDocument();
    expect(within(typeSelect).getByRole('option', { name: 'Servicio mecánico' })).toBeInTheDocument();
    expect(within(typeSelect).getByRole('option', { name: 'Entrega' })).toBeInTheDocument();
    expect(within(typeSelect).queryByRole('option', { name: 'Pieza' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Descripción'), 'Filtro de aceite');
    await user.clear(screen.getByLabelText('Precio'));
    await user.type(screen.getByLabelText('Precio'), '100');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(await screen.findByText('Filtro de aceite')).toBeVisible();

    const genericCall = fetchMock.mock.calls.find(
      ([requestPath, init]) =>
        String(requestPath) === `/api/sales/${draftId}/lines` && init?.method === 'POST',
    );
    expect(JSON.parse(genericCall![1].body)).toMatchObject({
      type: 'GENERIC',
      costProvenance: 'UNKNOWN',
      unitPrice: '100.00',
    });

    await user.click(screen.getByRole('button', { name: 'Agregar línea' }));
    await user.selectOptions(screen.getByLabelText('Tipo de línea'), 'SERVICE');
    await user.clear(screen.getByLabelText('Precio'));
    await user.type(screen.getByLabelText('Precio'), '40');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(await screen.findByText('Instalación mecánica')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Agregar línea' }));
    await user.selectOptions(screen.getByLabelText('Tipo de línea'), 'DELIVERY');
    const deliveryDescription = screen.getByLabelText('Descripción');
    await user.clear(deliveryDescription);
    await user.type(deliveryDescription, 'Entrega al patio');
    await user.clear(screen.getByLabelText('Importe (0 = cortesía)'));
    await user.type(screen.getByLabelText('Importe (0 = cortesía)'), '0');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(await screen.findByText('Entrega al patio')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Agregar línea' }));
    await user.selectOptions(screen.getByLabelText('Tipo de línea'), 'EXTERNAL');
    const externalDescription = screen.getByLabelText('Descripción');
    await user.clear(externalDescription);
    await user.type(externalDescription, 'Bomba comprada');
    await user.type(screen.getByLabelText('Costo de adquisición en pesos (opcional)'), '20');
    await user.clear(screen.getByLabelText('Precio'));
    await user.type(screen.getByLabelText('Precio'), '80');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(await screen.findByText('Bomba comprada')).toBeVisible();
    const externalCall = fetchMock.mock.calls.find(([requestPath, init]) => {
      if (String(requestPath) !== `/api/sales/${draftId}/lines` || init?.method !== 'POST') {
        return false;
      }
      return JSON.parse(init.body as string).type === 'EXTERNAL';
    });
    expect(JSON.parse(externalCall![1].body)).toMatchObject({
      type: 'EXTERNAL',
      costProvenance: 'ACTUAL',
      acquisitionCostDop: '20.00',
    });

    await user.selectOptions(screen.getByLabelText('Moneda'), 'USD');
    expect(
      fetchMock.mock.calls.some(
        ([requestPath, init]) =>
          String(requestPath) === `/api/sales/${draftId}` &&
          init?.method === 'PATCH' &&
          JSON.parse(init.body as string).currency === 'USD',
      ),
    ).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Confirmar venta' }));
    expect(screen.queryByRole('dialog', { name: 'Confirmar venta' })).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([requestPath]) => String(requestPath).endsWith('/confirm')),
    ).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Descartar borrador' }));
    await user.click(screen.getByRole('button', { name: 'Sí, descartar' }));
    expect(await screen.findByRole('heading', { name: 'Ventas y Facturas' })).toBeVisible();
  });

  it('shows an empty completed tab without requesting completed invoices', async () => {
    const user = userEvent.setup();
    invoice = emptyInvoice();
    mount();
    expect(await screen.findByText(`Borrador ${draftId}`)).toBeVisible();
    fetchMock.mockClear();
    await user.click(screen.getByRole('button', { name: 'Completada' }));
    expect(await screen.findByText('No hay facturas en esta pestaña')).toBeVisible();
    expect(fetchMock.mock.calls.some(([path]) => String(path).includes('/api/sales'))).toBe(false);
  });

  it('denies a mechanic the sales screen without calling the sales API', async () => {
    role = 'MECHANIC';
    mount();

    expect(await screen.findByText('Acceso no autorizado')).toBeVisible();
    expect(
      fetchMock.mock.calls.some(([path]) => String(path).startsWith('/api/sales')),
    ).toBe(false);
  });
});
