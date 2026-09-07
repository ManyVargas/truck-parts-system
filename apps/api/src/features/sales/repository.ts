import type { Invoice, InvoiceSequence, Prisma } from '@prisma/client';

import { prisma } from '../../infrastructure/database/index.js';
import type {
  CreateDraftInvoiceRecord,
  CreateInvoiceLineRecord,
  InvoiceListRecord,
  InvoiceRecord,
  InvoiceSequenceRecord,
  ListInvoicesQuery,
  UpdateDraftInvoiceRecord,
  UpdateInvoiceLinePriceRecord,
} from './types.js';

export const INVOICE_SEQUENCE_NAME = 'FAC';

type SalesDatabase = Pick<
  Prisma.TransactionClient,
  'invoice' | 'invoiceSequence' | '$queryRaw'
>;

const invoiceDetailInclude = {
  customer: true,
  lines: { orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }] },
};

const invoiceListInclude = {
  customer: true,
};

export class SalesRepository {
  constructor(private readonly database: SalesDatabase = prisma) {}

  createDraft(input: CreateDraftInvoiceRecord): Promise<InvoiceRecord> {
    return this.database.invoice.create({
      data: {
        status: 'DRAFT',
        currency: input.currency,
        fiscal: input.fiscal,
        customerId: input.customerId,
      },
      include: invoiceDetailInclude,
    });
  }

  findById(id: string): Promise<InvoiceRecord | null> {
    return this.database.invoice.findUnique({
      where: { id },
      include: invoiceDetailInclude,
    });
  }

  async list(query: ListInvoicesQuery): Promise<{
    items: InvoiceListRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.database.invoice.findMany({
        where,
        include: invoiceListInclude,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.database.invoice.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  updateDraft(id: string, input: UpdateDraftInvoiceRecord): Promise<InvoiceRecord> {
    return this.database.invoice.update({
      where: { id },
      data: {
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.fiscal !== undefined ? { fiscal: input.fiscal } : {}),
        ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
      },
      include: invoiceDetailInclude,
    });
  }

  deleteById(id: string): Promise<Invoice> {
    return this.database.invoice.delete({ where: { id } });
  }

  addLine(input: CreateInvoiceLineRecord): Promise<InvoiceRecord> {
    return this.database.invoice.update({
      where: { id: input.invoiceId },
      data: {
        lines: {
          create: {
            type: input.type,
            description: input.description,
            ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
            unitPrice: input.unitPrice,
            acquisitionCostDop: input.acquisitionCostDop ?? null,
            costProvenance: input.costProvenance ?? null,
            serviceId: input.serviceId ?? null,
          },
        },
      },
      include: invoiceDetailInclude,
    });
  }

  updateLinePrice(input: UpdateInvoiceLinePriceRecord): Promise<InvoiceRecord> {
    return this.database.invoice.update({
      where: { id: input.invoiceId },
      data: {
        lines: {
          update: {
            where: { id: input.lineId },
            data: { unitPrice: input.unitPrice },
          },
        },
      },
      include: invoiceDetailInclude,
    });
  }

  removeLine(invoiceId: string, lineId: string): Promise<InvoiceRecord> {
    return this.database.invoice.update({
      where: { id: invoiceId },
      data: {
        lines: {
          delete: { id: lineId },
        },
      },
      include: invoiceDetailInclude,
    });
  }

  findSequence(name = INVOICE_SEQUENCE_NAME): Promise<InvoiceSequenceRecord | null> {
    return this.database.invoiceSequence.findUnique({ where: { name } });
  }

  async lockSequenceForUpdate(
    name = INVOICE_SEQUENCE_NAME,
  ): Promise<InvoiceSequenceRecord> {
    const rows = await this.database.$queryRaw<InvoiceSequence[]>`
      SELECT "name", "nextValue"
      FROM "InvoiceSequence"
      WHERE "name" = ${name}
      FOR UPDATE
    `;
    const sequence = rows[0];
    if (!sequence) {
      throw new Error(`Invoice sequence ${name} is missing`);
    }
    return { name: sequence.name, nextValue: Number(sequence.nextValue) };
  }
}
