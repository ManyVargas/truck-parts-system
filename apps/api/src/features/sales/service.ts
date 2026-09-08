import type { InvoiceLine, InvoiceLineType, InvoiceStatus } from '@prisma/client';

import { AppError } from '../../infrastructure/errors/app-error.js';
import { CatalogRepository } from '../catalogs/repository.js';
import { satisfiesFiscalIdentity } from '../customers/fiscal.js';
import {
  CATALOG_SERVICE_NOT_FOUND_MESSAGE,
  DEFAULT_DRAFT_CURRENCY,
  DRAFT_ONLY_DISCARD_MESSAGE,
  DRAFT_ONLY_EDIT_MESSAGE,
  DUPLICATE_DELIVERY_LINE_MESSAGE,
  FISCAL_IDENTITY_REQUIRED_MESSAGE,
  INACTIVE_SERVICE_LINE_MESSAGE,
  LINE_NOT_FOUND_MESSAGE,
  MISSING_GENERIC_CUSTOMER_MESSAGE,
} from './constants.js';
import { DEFAULT_LINE_QUANTITY } from './money/constants.js';
import {
  calculateLineMoney,
  normalizeAcquisitionCost,
  parsePositiveDecimal,
} from './money/index.js';
import { assertDraftLineTypeEnabled, assertInvoiceManager } from './policies.js';
import {
  toDraftHistorySnapshot,
  toLineHistorySnapshot,
  toPublicInvoice,
  toPublicInvoiceListItem,
} from './projection.js';
import { salesTransaction, type SalesTransaction } from './transaction.js';
import type { CreateInvoiceLineRecord } from './types.js';
import {
  addInvoiceLineSchema,
  createDraftSchema,
  deliveryDraftLineSchema,
  externalDraftLineSchema,
  genericDraftLineSchema,
  invoiceIdSchema,
  invoiceLineIdSchema,
  listInvoicesSchema,
  serviceDraftLineSchema,
  setLinePriceSchema,
  updateDraftMetaSchema,
} from './validation.js';

type DraftLineWrite = Omit<CreateInvoiceLineRecord, 'invoiceId'>;

function assertDraftStatus(status: InvoiceStatus, message: string): void {
  if (status !== 'DRAFT') throw AppError.conflict(message);
}

function assertFiscalCustomer(
  customer: { isDefault: boolean; rnc: string | null },
  fiscal: boolean,
): void {
  if (fiscal && !satisfiesFiscalIdentity(customer)) {
    throw AppError.conflict(FISCAL_IDENTITY_REQUIRED_MESSAGE);
  }
}

function toMerchandiseDraftLine(profile: {
  type: 'GENERIC' | 'EXTERNAL';
  description: string;
  quantity?: string;
  unitPrice: string;
  costProvenance: 'ACTUAL' | 'ESTIMATED' | 'UNKNOWN';
  acquisitionCostDop?: string | null;
}): DraftLineWrite {
  // GENERIC and EXTERNAL share COST-001: DOP cost + provenance, optional quantity.
  const quantity =
    profile.quantity === undefined
      ? DEFAULT_LINE_QUANTITY
      : parsePositiveDecimal(profile.quantity, 'quantity');
  const cost = normalizeAcquisitionCost({
    provenance: profile.costProvenance,
    amount: profile.acquisitionCostDop,
  });
  return {
    type: profile.type,
    description: profile.description,
    quantity,
    unitPrice: profile.unitPrice,
    acquisitionCostDop: cost.amount,
    costProvenance: cost.provenance,
  };
}

function resolveDeliveryDraftLine(candidate: unknown): DraftLineWrite {
  const profile = deliveryDraftLineSchema.parse(candidate);
  return {
    type: profile.type,
    description: profile.description,
    quantity: DEFAULT_LINE_QUANTITY,
    unitPrice: profile.unitPrice,
  };
}

async function resolveServiceDraftLine(
  catalogs: CatalogRepository,
  candidate: unknown,
): Promise<DraftLineWrite> {
  const profile = serviceDraftLineSchema.parse(candidate);
  const catalogService = await catalogs.findById(profile.serviceId);
  if (!catalogService) throw AppError.notFound(CATALOG_SERVICE_NOT_FOUND_MESSAGE);
  if (!catalogService.active) {
    throw AppError.conflict(INACTIVE_SERVICE_LINE_MESSAGE, { serviceId: profile.serviceId });
  }

  return {
    type: profile.type,
    description: profile.description ?? catalogService.name,
    quantity: DEFAULT_LINE_QUANTITY,
    unitPrice: profile.unitPrice,
    serviceId: profile.serviceId,
  };
}

async function resolveDraftLineWrite(
  catalogs: CatalogRepository,
  candidate: { type: InvoiceLineType },
): Promise<DraftLineWrite> {
  if (candidate.type === 'SERVICE') return resolveServiceDraftLine(catalogs, candidate);
  if (candidate.type === 'DELIVERY') return resolveDeliveryDraftLine(candidate);
  if (candidate.type === 'EXTERNAL') {
    return toMerchandiseDraftLine(externalDraftLineSchema.parse(candidate));
  }
  return toMerchandiseDraftLine(genericDraftLineSchema.parse(candidate));
}

function addedLine(before: InvoiceLine[], after: InvoiceLine[]): InvoiceLine {
  const previousIds = new Set(before.map((line) => line.id));
  const created = after.find((line) => !previousIds.has(line.id));
  if (!created) throw AppError.internal('Created invoice line is missing');
  return created;
}

export class SalesService {
  constructor(private readonly transaction: SalesTransaction = salesTransaction) {}

  async createDraft(actorId: string, input: unknown) {
    const profile = createDraftSchema.parse(input ?? {});
    return this.transaction(async ({ sales, customers, users, history }) => {
      assertInvoiceManager(await users.findById(actorId));
      const customer = profile.customerId
        ? await customers.findById(profile.customerId)
        : await customers.findDefault();
      if (profile.customerId && !customer) throw AppError.notFound('Customer not found');
      if (!customer) throw AppError.internal(MISSING_GENERIC_CUSTOMER_MESSAGE);

      const currency = profile.currency ?? DEFAULT_DRAFT_CURRENCY;
      const fiscal = profile.fiscal ?? false;
      assertFiscalCustomer(customer, fiscal);

      const invoice = await sales.createDraft({
        customerId: customer.id,
        currency,
        fiscal,
      });
      await history.append({
        actor: { actorType: 'USER', actorUserId: actorId },
        subjectType: 'INVOICE',
        subjectId: invoice.id,
        eventType: 'INVOICE_DRAFT_CREATED',
        payload: toDraftHistorySnapshot(invoice),
      });
      return toPublicInvoice(invoice);
    });
  }

  async list(actorId: string, query: unknown) {
    const filters = listInvoicesSchema.parse(query);
    return this.transaction(async ({ sales, users }) => {
      assertInvoiceManager(await users.findById(actorId));
      const result = await sales.list(filters);
      return { ...result, items: result.items.map(toPublicInvoiceListItem) };
    });
  }

  async getById(actorId: string, id: string) {
    invoiceIdSchema.parse({ id });
    return this.transaction(async ({ sales, users }) => {
      assertInvoiceManager(await users.findById(actorId));
      const invoice = await sales.findById(id);
      if (!invoice) throw AppError.notFound('Invoice not found');
      return toPublicInvoice(invoice);
    });
  }

  async updateMeta(actorId: string, id: string, input: unknown) {
    invoiceIdSchema.parse({ id });
    const patch = updateDraftMetaSchema.parse(input);
    return this.transaction(async ({ sales, customers, users, history }) => {
      assertInvoiceManager(await users.findById(actorId));
      const existing = await sales.findById(id);
      if (!existing) throw AppError.notFound('Invoice not found');
      assertDraftStatus(existing.status, DRAFT_ONLY_EDIT_MESSAGE);

      let customer = existing.customer;
      if (patch.customerId) {
        const assigned = await customers.findById(patch.customerId);
        if (!assigned) throw AppError.notFound('Customer not found');
        customer = assigned;
      }

      const nextFiscal = patch.fiscal ?? existing.fiscal;
      assertFiscalCustomer(customer, nextFiscal);

      const updated = await sales.updateDraft(id, {
        customerId: patch.customerId,
        currency: patch.currency,
        fiscal: patch.fiscal,
      });
      await history.append({
        actor: { actorType: 'USER', actorUserId: actorId },
        subjectType: 'INVOICE',
        subjectId: id,
        eventType: 'INVOICE_DRAFT_UPDATED',
        payload: {
          before: toDraftHistorySnapshot(existing),
          after: toDraftHistorySnapshot(updated),
        },
      });
      return toPublicInvoice(updated);
    });
  }

  async discard(actorId: string, id: string) {
    invoiceIdSchema.parse({ id });
    return this.transaction(async ({ sales, users, history }) => {
      assertInvoiceManager(await users.findById(actorId));
      const existing = await sales.findById(id);
      if (!existing) throw AppError.notFound('Invoice not found');
      assertDraftStatus(existing.status, DRAFT_ONLY_DISCARD_MESSAGE);
      await history.append({
        actor: { actorType: 'USER', actorUserId: actorId },
        subjectType: 'INVOICE',
        subjectId: id,
        eventType: 'INVOICE_DRAFT_DISCARDED',
        payload: toDraftHistorySnapshot(existing),
      });
      await sales.deleteById(id);
    });
  }

  async addLine(actorId: string, invoiceId: string, input: unknown) {
    invoiceIdSchema.parse({ id: invoiceId });
    const candidate = addInvoiceLineSchema.parse(input);

    return this.transaction(async ({ sales, users, history, catalogs }) => {
      assertInvoiceManager(await users.findById(actorId));
      const existing = await sales.findById(invoiceId);
      if (!existing) throw AppError.notFound('Invoice not found');
      assertDraftStatus(existing.status, DRAFT_ONLY_EDIT_MESSAGE);
      assertDraftLineTypeEnabled(candidate.type);
      if (
        candidate.type === 'DELIVERY' &&
        existing.lines.some((line) => line.type === 'DELIVERY')
      ) {
        throw AppError.conflict(DUPLICATE_DELIVERY_LINE_MESSAGE);
      }
      const line = await resolveDraftLineWrite(catalogs, candidate);

      calculateLineMoney({
        type: line.type,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        fiscal: existing.fiscal,
      });

      const updated = await sales.addLine({
        invoiceId,
        ...line,
      });
      const created = addedLine(existing.lines, updated.lines);
      await history.append({
        actor: { actorType: 'USER', actorUserId: actorId },
        subjectType: 'INVOICE',
        subjectId: invoiceId,
        eventType: 'INVOICE_LINE_ADDED',
        payload: toLineHistorySnapshot(created),
      });
      return toPublicInvoice(updated);
    });
  }

  async setLinePrice(actorId: string, invoiceId: string, lineId: string, input: unknown) {
    invoiceLineIdSchema.parse({ id: invoiceId, lineId });
    const patch = setLinePriceSchema.parse(input);

    return this.transaction(async ({ sales, users, history }) => {
      assertInvoiceManager(await users.findById(actorId));
      const existing = await sales.findById(invoiceId);
      if (!existing) throw AppError.notFound('Invoice not found');
      assertDraftStatus(existing.status, DRAFT_ONLY_EDIT_MESSAGE);
      const line = existing.lines.find((entry) => entry.id === lineId);
      if (!line) throw AppError.notFound(LINE_NOT_FOUND_MESSAGE);
      assertDraftLineTypeEnabled(line.type);

      calculateLineMoney({
        type: line.type,
        unitPrice: patch.unitPrice,
        quantity: line.quantity,
        fiscal: existing.fiscal,
      });

      const updated = await sales.updateLinePrice({
        invoiceId,
        lineId,
        unitPrice: patch.unitPrice,
      });
      const next = updated.lines.find((entry) => entry.id === lineId);
      if (!next) throw AppError.internal(LINE_NOT_FOUND_MESSAGE);
      await history.append({
        actor: { actorType: 'USER', actorUserId: actorId },
        subjectType: 'INVOICE',
        subjectId: invoiceId,
        eventType: 'INVOICE_LINE_UPDATED',
        payload: {
          before: toLineHistorySnapshot(line),
          after: toLineHistorySnapshot(next),
        },
      });
      return toPublicInvoice(updated);
    });
  }

  async removeLine(actorId: string, invoiceId: string, lineId: string) {
    invoiceLineIdSchema.parse({ id: invoiceId, lineId });

    return this.transaction(async ({ sales, users, history }) => {
      assertInvoiceManager(await users.findById(actorId));
      const existing = await sales.findById(invoiceId);
      if (!existing) throw AppError.notFound('Invoice not found');
      assertDraftStatus(existing.status, DRAFT_ONLY_EDIT_MESSAGE);
      const line = existing.lines.find((entry) => entry.id === lineId);
      if (!line) throw AppError.notFound(LINE_NOT_FOUND_MESSAGE);

      await history.append({
        actor: { actorType: 'USER', actorUserId: actorId },
        subjectType: 'INVOICE',
        subjectId: invoiceId,
        eventType: 'INVOICE_LINE_REMOVED',
        payload: toLineHistorySnapshot(line),
      });
      const updated = await sales.removeLine(invoiceId, lineId);
      return toPublicInvoice(updated);
    });
  }
}

export const salesService = new SalesService();
