import type { InvoiceStatus } from '@prisma/client';

import { AppError } from '../../infrastructure/errors/app-error.js';
import { satisfiesFiscalIdentity } from '../customers/fiscal.js';
import {
  DEFAULT_DRAFT_CURRENCY,
  DRAFT_ONLY_DISCARD_MESSAGE,
  DRAFT_ONLY_EDIT_MESSAGE,
  FISCAL_IDENTITY_REQUIRED_MESSAGE,
  MISSING_GENERIC_CUSTOMER_MESSAGE,
} from './constants.js';
import { assertInvoiceManager } from './policies.js';
import { toDraftHistorySnapshot, toPublicInvoice, toPublicInvoiceListItem } from './projection.js';
import { salesTransaction, type SalesTransaction } from './transaction.js';
import {
  createDraftSchema,
  invoiceIdSchema,
  listInvoicesSchema,
  updateDraftMetaSchema,
} from './validation.js';

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
}

export const salesService = new SalesService();
