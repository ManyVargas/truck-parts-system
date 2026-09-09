import type { LineType } from '../contracts/entities';
import type {
  AddDraftLineInput,
  AddPaymentInput,
  CancelInvoiceInput,
  ConfirmInvoicePayment,
  CorrectCurrencyInput,
  CreateDraftResult,
  InvoiceDetailView,
  PosDraftView,
  PosLineView,
  RemoveDraftLineInput,
  SalesListRow,
  SalesListTab,
  SetDraftLinePriceInput,
  SetDraftLineQuantityInput,
  SetDraftMetaInput,
} from '../contracts/sales';
import { err, ok, type Result } from '../../shared/auth/types';
import { listCustomersWithHttp } from './customers-api';
import { listServicesWithHttp } from './catalogs-api';
import { httpClient, toAppError } from './http-client';
import { httpNotImplemented } from './http-not-implemented';

const SALES_PATH = '/api/sales';
const PAGE_SIZE = 100;
const CSRF_HEADERS = { 'X-Requested-With': 'XMLHttpRequest' };
const DEFAULT_DELIVERY_DESCRIPTION = 'Entrega';

type ApiCustomerView = {
  id: string;
  name: string;
  rnc: string | null;
  isDefault: boolean;
};

type ApiInvoiceLine = {
  id: string;
  type: LineType;
  description: string;
  notes: string | null;
  quantity: string;
  unitPrice: string;
  taxable: boolean;
  gross: string;
  base: string;
  itbis: string;
  acquisitionCostDop: string | null;
  costProvenance: 'ACTUAL' | 'ESTIMATED' | 'UNKNOWN' | null;
  serviceId: string | null;
};

type ApiInvoice = {
  id: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  number: string | null;
  currency: 'DOP' | 'USD';
  fiscal: boolean;
  customer: ApiCustomerView;
  createdAt: string;
  confirmedAt: string | null;
  lines: ApiInvoiceLine[];
  totals: { gross: string; base: string; itbis: string };
};

type ApiInvoiceListItem = Omit<ApiInvoice, 'lines'>;

type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

async function request<T>(operation: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await operation());
  } catch (error) {
    return err(toAppError(error));
  }
}

function moneyNumber(value: string): number {
  return Number(value);
}

function moneyString(value: number): string {
  return value.toFixed(2);
}

function optionalText(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

function toPosLine(line: ApiInvoiceLine): PosLineView {
  return {
    id: line.id,
    type: line.type,
    description: line.description,
    notes: optionalText(line.notes),
    quantity: moneyNumber(line.quantity),
    unitPrice: moneyNumber(line.unitPrice),
    taxable: line.taxable,
    pricePending: false,
    gross: moneyNumber(line.gross),
    itbis: moneyNumber(line.itbis),
    base: moneyNumber(line.base),
    serviceId: line.serviceId ?? undefined,
    acquisitionCostDop:
      line.acquisitionCostDop == null ? undefined : moneyNumber(line.acquisitionCostDop),
  };
}

function toPosDraft(
  invoice: ApiInvoice,
  customers: PosDraftView['customers'],
  services: PosDraftView['services'],
): PosDraftView {
  return {
    id: invoice.id,
    status: invoice.status,
    number: optionalText(invoice.number),
    customerId: invoice.customer.id,
    customerName: invoice.customer.name,
    customerRnc: optionalText(invoice.customer.rnc),
    customerIsDefault: invoice.customer.isDefault,
    currency: invoice.currency,
    fiscal: invoice.fiscal,
    lines: invoice.lines.map(toPosLine),
    totals: {
      lineCount: invoice.lines.length,
      gross: moneyNumber(invoice.totals.gross),
      itbis: moneyNumber(invoice.totals.itbis),
      taxableBase: moneyNumber(invoice.totals.base),
    },
    customers,
    services,
    qtyProducts: [],
    items: [],
    blockers: [],
    createdWorkOrderIds: [],
  };
}

function toSalesListRow(item: ApiInvoiceListItem): SalesListRow {
  return {
    id: item.id,
    number: item.number ?? `Borrador ${item.id}`,
    status: item.status,
    paymentState: 'UNPAID',
    customerId: item.customer.id,
    customerName: item.customer.name,
    currency: item.currency,
    fiscal: item.fiscal,
    total: moneyNumber(item.totals.gross),
    balance: 0,
    createdAt: item.createdAt,
    confirmedAt: optionalText(item.confirmedAt),
    href: `/sales/draft/${item.id}`,
  };
}

function merchandiseCost(acquisitionCostDop: number | undefined) {
  if (acquisitionCostDop == null || !Number.isFinite(acquisitionCostDop)) {
    return { costProvenance: 'UNKNOWN' as const };
  }
  return {
    costProvenance: 'ACTUAL' as const,
    acquisitionCostDop: moneyString(acquisitionCostDop),
  };
}

function optionalNotesBody(notes: string | null | undefined): { notes?: string | null } {
  if (notes === undefined) return {};
  const trimmed = notes?.trim() ?? '';
  return { notes: trimmed === '' ? null : trimmed };
}

export function toHttpAddLineBody(input: AddDraftLineInput): Record<string, unknown> {
  const notes = optionalNotesBody(input.notes);

  if (input.type === 'GENERIC' || input.type === 'EXTERNAL') {
    return {
      type: input.type,
      description: input.description?.trim() ?? '',
      unitPrice: moneyString(input.unitPrice ?? 0),
      ...(input.quantity != null ? { quantity: moneyString(input.quantity) } : {}),
      ...merchandiseCost(input.acquisitionCostDop),
      ...notes,
    };
  }

  if (input.type === 'SERVICE') {
    return {
      type: 'SERVICE',
      serviceId: input.serviceId,
      unitPrice: moneyString(input.unitPrice ?? 0),
      ...(input.description?.trim() ? { description: input.description.trim() } : {}),
      ...notes,
    };
  }

  if (input.type === 'DELIVERY') {
    return {
      type: 'DELIVERY',
      description: input.description?.trim() || DEFAULT_DELIVERY_DESCRIPTION,
      unitPrice: moneyString(input.unitPrice ?? 0),
      ...notes,
    };
  }

  return { type: input.type, ...notes };
}

function draftsCollectionPath(page: number): string {
  const params = new URLSearchParams({
    status: 'DRAFT',
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  return `${SALES_PATH}?${params.toString()}`;
}

async function loadAllDraftPages(): Promise<SalesListRow[]> {
  const items: SalesListRow[] = [];
  let page = 1;
  let total = 0;

  do {
    const response = await httpClient<Page<ApiInvoiceListItem>>(draftsCollectionPath(page));
    items.push(...response.items.map(toSalesListRow));
    total = response.total;
    if (response.items.length === 0) break;
    page += 1;
  } while (items.length < total);

  return items;
}

async function loadPosLookups(): Promise<
  Result<{ customers: PosDraftView['customers']; services: PosDraftView['services'] }>
> {
  const [customersResult, servicesResult] = await Promise.all([
    listCustomersWithHttp(),
    listServicesWithHttp(),
  ]);
  if (!customersResult.ok) return customersResult;
  if (!servicesResult.ok) return servicesResult;

  return ok({
    customers: customersResult.value.map((customer) => ({
      id: customer.id,
      name: customer.name,
      rnc: customer.rnc,
      isDefault: customer.isDefault,
    })),
    services: servicesResult.value
      .filter((service) => service.active)
      .map((service) => ({ id: service.id, name: service.name })),
  });
}

async function toPosDraftView(invoice: ApiInvoice): Promise<Result<PosDraftView>> {
  const lookups = await loadPosLookups();
  if (!lookups.ok) return lookups;

  const services = [...lookups.value.services];
  for (const line of invoice.lines) {
    if (line.serviceId && !services.some((service) => service.id === line.serviceId)) {
      services.push({ id: line.serviceId, name: line.description });
    }
  }

  return ok(toPosDraft(invoice, lookups.value.customers, services));
}

async function mutateDraft(operation: () => Promise<ApiInvoice>): Promise<Result<PosDraftView>> {
  let invoice: ApiInvoice;
  try {
    invoice = await operation();
  } catch (error) {
    return err(toAppError(error));
  }

  const view = await toPosDraftView(invoice);
  if (view.ok) return view;

  // The write already succeeded, so an auxiliary lookup failure must not invite a duplicate retry.
  const services: PosDraftView['services'] = [];
  for (const line of invoice.lines) {
    if (line.serviceId && !services.some((service) => service.id === line.serviceId)) {
      services.push({ id: line.serviceId, name: line.description });
    }
  }
  return ok(
    toPosDraft(
      invoice,
      [
        {
          id: invoice.customer.id,
          name: invoice.customer.name,
          rnc: optionalText(invoice.customer.rnc),
          isDefault: invoice.customer.isDefault,
        },
      ],
      services,
    ),
  );
}

export function listInvoicesWithHttp(tab?: SalesListTab): Promise<Result<SalesListRow[]>> {
  if (tab === 'COMPLETED' || tab === 'CANCELLED') {
    return Promise.resolve(ok([]));
  }
  return request(() => loadAllDraftPages());
}

export async function getInvoiceWithHttp(_id: string): Promise<Result<InvoiceDetailView>> {
  return httpNotImplemented('HttpSalesRepository', 'getInvoice');
}

export async function addPaymentWithHttp(
  _input: AddPaymentInput,
): Promise<Result<InvoiceDetailView>> {
  return httpNotImplemented('HttpSalesRepository', 'addPayment');
}

export async function cancelInvoiceWithHttp(
  _input: CancelInvoiceInput,
): Promise<Result<InvoiceDetailView>> {
  return httpNotImplemented('HttpSalesRepository', 'cancelInvoice');
}

export async function correctCurrencyWithHttp(
  _input: CorrectCurrencyInput,
): Promise<Result<InvoiceDetailView>> {
  return httpNotImplemented('HttpSalesRepository', 'correctCurrency');
}

export function createDraftWithHttp(): Promise<Result<CreateDraftResult>> {
  return request(async () => {
    const invoice = await httpClient<ApiInvoice>(SALES_PATH, {
      method: 'POST',
      headers: CSRF_HEADERS,
      body: JSON.stringify({}),
    });
    return { draftId: invoice.id };
  });
}

export async function getDraftWithHttp(id: string): Promise<Result<PosDraftView>> {
  try {
    const invoice = await httpClient<ApiInvoice>(`${SALES_PATH}/${id}`);
    return toPosDraftView(invoice);
  } catch (error) {
    return err(toAppError(error));
  }
}

export function addDraftLineWithHttp(input: AddDraftLineInput): Promise<Result<PosDraftView>> {
  return mutateDraft(() =>
    httpClient<ApiInvoice>(`${SALES_PATH}/${input.draftId}/lines`, {
      method: 'POST',
      headers: CSRF_HEADERS,
      body: JSON.stringify(toHttpAddLineBody(input)),
    }),
  );
}

export function removeDraftLineWithHttp(
  input: RemoveDraftLineInput,
): Promise<Result<PosDraftView>> {
  return mutateDraft(() =>
    httpClient<ApiInvoice>(`${SALES_PATH}/${input.draftId}/lines/${input.lineId}`, {
      method: 'DELETE',
      headers: CSRF_HEADERS,
    }),
  );
}

export function setDraftLinePriceWithHttp(
  input: SetDraftLinePriceInput,
): Promise<Result<PosDraftView>> {
  const body: Record<string, unknown> = {};
  if (input.unitPrice !== undefined) body.unitPrice = moneyString(input.unitPrice);
  if (input.quantity !== undefined) body.quantity = moneyString(input.quantity);
  if (input.description !== undefined) body.description = input.description.trim();
  if (input.notes !== undefined) {
    const trimmed = input.notes?.trim() ?? '';
    body.notes = trimmed === '' ? null : trimmed;
  }
  if (input.acquisitionCostDop !== undefined) {
    body.acquisitionCostDop =
      input.acquisitionCostDop == null ? null : moneyString(input.acquisitionCostDop);
  }

  return mutateDraft(() =>
    httpClient<ApiInvoice>(`${SALES_PATH}/${input.draftId}/lines/${input.lineId}`, {
      method: 'PATCH',
      headers: CSRF_HEADERS,
      body: JSON.stringify(body),
    }),
  );
}

export function setDraftLineQuantityWithHttp(
  input: SetDraftLineQuantityInput,
): Promise<Result<PosDraftView>> {
  return mutateDraft(() =>
    httpClient<ApiInvoice>(`${SALES_PATH}/${input.draftId}/lines/${input.lineId}`, {
      method: 'PATCH',
      headers: CSRF_HEADERS,
      body: JSON.stringify({ quantity: moneyString(input.quantity) }),
    }),
  );
}

export function setDraftMetaWithHttp(input: SetDraftMetaInput): Promise<Result<PosDraftView>> {
  const body: Record<string, unknown> = {};
  if (input.customerId !== undefined) body.customerId = input.customerId;
  if (input.currency !== undefined) body.currency = input.currency;
  if (input.fiscal !== undefined) body.fiscal = input.fiscal;

  return mutateDraft(() =>
    httpClient<ApiInvoice>(`${SALES_PATH}/${input.draftId}`, {
      method: 'PATCH',
      headers: CSRF_HEADERS,
      body: JSON.stringify(body),
    }),
  );
}

export async function confirmInvoiceWithHttp(
  _draftId: string,
  _payment?: ConfirmInvoicePayment,
): Promise<Result<PosDraftView>> {
  return httpNotImplemented('HttpSalesRepository', 'confirmInvoice');
}

export function discardDraftWithHttp(draftId: string): Promise<Result<void>> {
  return request(async () => {
    await httpClient<void>(`${SALES_PATH}/${draftId}`, {
      method: 'DELETE',
      headers: CSRF_HEADERS,
      parseJson: false,
    });
  });
}
