import type { InvoiceSequence, Prisma } from '@prisma/client';

import { prisma } from '../../infrastructure/database/index.js';
import type {
  CreateDraftInvoiceRecord,
  CreateInvoiceLineRecord,
  InvoiceRecord,
  InvoiceSequenceRecord,
} from './types.js';

export const INVOICE_SEQUENCE_NAME = 'FAC';

type SalesDatabase = Pick<
  Prisma.TransactionClient,
  'invoice' | 'invoiceSequence' | '$queryRaw'
>;

const invoiceWithLines = {
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
      include: invoiceWithLines,
    });
  }

  findById(id: string): Promise<InvoiceRecord | null> {
    return this.database.invoice.findUnique({
      where: { id },
      include: invoiceWithLines,
    });
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
      include: invoiceWithLines,
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
