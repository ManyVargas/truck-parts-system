import type { Invoice, InvoiceSequence, Prisma } from '@prisma/client';

import { prisma } from '../../infrastructure/database/index.js';
import { formatInvoiceNumber } from './constants.js';
import type {
  CompleteInvoiceRecord,
  CreateDraftInvoiceRecord,
  CreateInvoiceLineRecord,
  InvoiceListRecord,
  InvoiceRecord,
  InvoiceSequenceRecord,
  ListInvoicesQuery,
  RecordManualGrossProfitRecord,
  RecordUsdFxRateRecord,
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
  lines: { orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }] },
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

  async lockById(id: string): Promise<void> {
    await this.database.$queryRaw`
      SELECT "id"
      FROM "Invoice"
      WHERE "id" = ${id}::uuid
      FOR UPDATE
    `;
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

  async allocateNextNumber(name = INVOICE_SEQUENCE_NAME): Promise<string> {
    const sequence = await this.lockSequenceForUpdate(name);
    const number = formatInvoiceNumber(sequence.nextValue);
    await this.database.invoiceSequence.update({
      where: { name },
      data: { nextValue: sequence.nextValue + 1 },
    });
    return number;
  }

  completeInvoice(input: CompleteInvoiceRecord): Promise<InvoiceRecord> {
    return this.database.invoice.update({
      where: { id: input.id },
      data: {
        status: 'COMPLETED',
        number: input.number,
        confirmedAt: input.confirmedAt,
        customerName: input.customerName,
        customerRnc: input.customerRnc,
        gross: input.gross,
        base: input.base,
        itbis: input.itbis,
        lines: {
          update: input.lines.map((line) => ({
            where: { id: line.id },
            data: { gross: line.gross, base: line.base, itbis: line.itbis },
          })),
        },
      },
      include: invoiceDetailInclude,
    });
  }

  recordManualGrossProfit(input: RecordManualGrossProfitRecord): Promise<InvoiceRecord> {
    return this.database.invoice.update({
      where: { id: input.id },
      data: {
        manualGrossProfitDop: input.profitDop,
        manualGrossProfitAt: input.recordedAt,
      },
      include: invoiceDetailInclude,
    });
  }

  async recordUsdFxRate(input: RecordUsdFxRateRecord): Promise<InvoiceRecord | null> {
    await this.database.invoice.updateMany({
      where: {
        id: input.id,
        status: 'COMPLETED',
        currency: 'USD',
        exchangeRateDopPerUsd: null,
      },
      data: {
        exchangeRateDopPerUsd: input.exchangeRateDopPerUsd,
        fxRateSource: input.source,
        fxRateUpdatedAt: input.rateUpdatedAt,
        fxRateObtainedAt: input.obtainedAt,
      },
    });
    return this.findById(input.id);
  }
}
