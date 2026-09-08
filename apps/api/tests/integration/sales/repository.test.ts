import { InvoiceCurrency, InvoiceLineType, CostProvenance } from '@prisma/client';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { CatalogRepository } from '../../../src/features/catalogs/repository.js';
import { CustomerRepository } from '../../../src/features/customers/repository.js';
import { SalesRepository } from '../../../src/features/sales/repository.js';
import { disconnectPrisma, prisma } from '../../../src/infrastructure/database/index.js';

const sales = new SalesRepository();
const customers = new CustomerRepository();
const catalog = new CatalogRepository();

async function cleanupSales() {
  await prisma.invoice.deleteMany();
  await prisma.mechanicalService.deleteMany();
}

describe('SalesRepository (PostgreSQL)', () => {
  afterEach(cleanupSales);
  afterAll(disconnectPrisma);

  it('creates a draft without a FAC- number and stores DOP or USD', async () => {
    const customer = await customers.findDefault();
    expect(customer).not.toBeNull();

    const dop = await sales.createDraft({
      customerId: customer!.id,
      currency: InvoiceCurrency.DOP,
      fiscal: false,
    });
    const usd = await sales.createDraft({
      customerId: customer!.id,
      currency: InvoiceCurrency.USD,
      fiscal: true,
    });

    expect(dop).toMatchObject({
      status: 'DRAFT',
      currency: InvoiceCurrency.DOP,
      fiscal: false,
      number: null,
      customerId: customer!.id,
      lines: [],
    });
    expect(usd).toMatchObject({
      status: 'DRAFT',
      currency: InvoiceCurrency.USD,
      fiscal: true,
      number: null,
    });
    expect(await sales.findById(dop.id)).toEqual(dop);
  });

  it('seeds the FAC sequence at nextValue 1 and can lock it without consuming', async () => {
    expect(await sales.findSequence()).toMatchObject({ name: 'FAC', nextValue: 1 });

    await prisma.$transaction(async (tx) => {
      const locked = await new SalesRepository(tx).lockSequenceForUpdate();
      expect(locked).toEqual({ name: 'FAC', nextValue: 1 });
    });

    expect(await sales.findSequence()).toMatchObject({ name: 'FAC', nextValue: 1 });
  });

  it('persists GENERIC cost-actual and SERVICE lines on a draft', async () => {
    const customer = await customers.findDefault();
    const service = await catalog.create({ name: 'Instalación mecánica' });
    const draft = await sales.createDraft({
      customerId: customer!.id,
      currency: InvoiceCurrency.DOP,
      fiscal: false,
    });

    const withGeneric = await sales.addLine({
      invoiceId: draft.id,
      type: InvoiceLineType.GENERIC,
      description: 'Filtro genérico',
      quantity: '2',
      unitPrice: '150.5',
      costProvenance: CostProvenance.ACTUAL,
      acquisitionCostDop: '80',
    });
    const withService = await sales.addLine({
      invoiceId: draft.id,
      type: InvoiceLineType.SERVICE,
      description: 'Instalación mecánica',
      unitPrice: '0',
      serviceId: service.id,
    });

    expect(withGeneric.lines).toHaveLength(1);
    expect(withGeneric.lines[0]).toMatchObject({
      type: InvoiceLineType.GENERIC,
      description: 'Filtro genérico',
      costProvenance: CostProvenance.ACTUAL,
    });
    expect(Number(withGeneric.lines[0]?.quantity)).toBe(2);
    expect(Number(withGeneric.lines[0]?.unitPrice)).toBe(150.5);
    expect(Number(withGeneric.lines[0]?.acquisitionCostDop)).toBe(80);

    expect(withService.lines).toHaveLength(2);
    expect(withService.lines[1]).toMatchObject({
      type: InvoiceLineType.SERVICE,
      serviceId: service.id,
      costProvenance: null,
      acquisitionCostDop: null,
    });
    expect(Number(withService.lines[1]?.quantity)).toBe(1);
    expect(Number(withService.lines[1]?.unitPrice)).toBe(0);
  });

  it('rejects UNKNOWN cost stored as zero at the database', async () => {
    const customer = await customers.findDefault();
    const draft = await sales.createDraft({
      customerId: customer!.id,
      currency: InvoiceCurrency.DOP,
      fiscal: false,
    });

    await expect(
      sales.addLine({
        invoiceId: draft.id,
        type: InvoiceLineType.GENERIC,
        description: 'Costo desconocido',
        unitPrice: '10',
        costProvenance: CostProvenance.UNKNOWN,
        acquisitionCostDop: '0',
      }),
    ).rejects.toThrow(/InvoiceLine_cost_check/);
  });

  it('rejects a SERVICE line without a catalog service at the database', async () => {
    const customer = await customers.findDefault();
    const draft = await sales.createDraft({
      customerId: customer!.id,
      currency: InvoiceCurrency.DOP,
      fiscal: false,
    });

    await expect(
      sales.addLine({
        invoiceId: draft.id,
        type: InvoiceLineType.SERVICE,
        description: 'Servicio sin catálogo',
        unitPrice: '100',
      }),
    ).rejects.toThrow(/InvoiceLine_serviceId_required_check/);
  });
});
