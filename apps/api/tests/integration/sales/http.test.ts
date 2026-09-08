import { randomUUID } from 'node:crypto';

import type { Role } from '@prisma/client';
import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { hashPassword } from '../../../src/features/access/password.js';
import { resetLoginRateLimit } from '../../../src/features/access/login-rate-limit.js';
import { CustomerRepository } from '../../../src/features/customers/repository.js';
import { HistoryRepository } from '../../../src/features/history/repository.js';
import {
  CATALOG_SERVICE_NOT_FOUND_MESSAGE,
  DRAFT_ONLY_DISCARD_MESSAGE,
  DRAFT_ONLY_EDIT_MESSAGE,
  DUPLICATE_DELIVERY_LINE_MESSAGE,
  FISCAL_IDENTITY_REQUIRED_MESSAGE,
  INACTIVE_SERVICE_LINE_MESSAGE,
  UNSUPPORTED_INVENTORY_LINE_MESSAGE,
  UNSUPPORTED_LINE_TYPE_MESSAGE,
} from '../../../src/features/sales/constants.js';
import { SalesService } from '../../../src/features/sales/service.js';
import { UserRepository } from '../../../src/features/users/repository.js';
import { disconnectPrisma, prisma } from '../../../src/infrastructure/database/index.js';
import { createTestApp } from '../../helpers/app.js';
import { clearTestHistory } from '../../helpers/history.js';

const app = createTestApp();
const users = new UserRepository();
const customers = new CustomerRepository();
const service = new SalesService();
const PASSWORD = 'personal-password';
const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };
const ROOT = '/api/sales';

async function fixture(role: Role = 'ADMINISTRATOR') {
  const user = await users.create({
    name: 'Fixture',
    username: randomUUID(),
    role,
    passwordHash: await hashPassword(PASSWORD),
  });
  const agent = request.agent(app);
  expect(
    (await agent.post('/api/auth/login').send({ username: user.username, password: PASSWORD }))
      .status,
  ).toBe(200);
  return { user, agent };
}

async function cleanup() {
  vi.restoreAllMocks();
  await resetLoginRateLimit();
  await clearTestHistory();
  await prisma.invoice.deleteMany();
  await prisma.mechanicalService.deleteMany();
  await prisma.customerContact.deleteMany({ where: { customer: { isDefault: false } } });
  await prisma.customer.deleteMany({ where: { isDefault: false } });
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

afterAll(disconnectPrisma);

describe('M7 draft HTTP shell (SALE-001 draft)', () => {
  afterEach(cleanup);

  it('creates a draft with Cliente contado, DOP and non-fiscal defaults', async () => {
    const seller = await fixture('SELLER');
    const generic = await customers.findDefault();
    expect(generic).not.toBeNull();

    const created = await seller.agent.post(ROOT).set(CSRF).send({});
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      status: 'DRAFT',
      number: null,
      currency: 'DOP',
      fiscal: false,
      customer: { id: generic!.id, isDefault: true },
      lines: [],
      totals: { gross: '0.00', base: '0.00', itbis: '0.00' },
    });
    expect(await prisma.historyEvent.findMany({ where: { subjectId: created.body.id } })).toEqual([
      expect.objectContaining({
        eventType: 'INVOICE_DRAFT_CREATED',
        actorUserId: seller.user.id,
        subjectType: 'INVOICE',
      }),
    ]);
  });

  it('lets Seller change currency and assign a fiscal customer', async () => {
    const seller = await fixture('SELLER');
    const identified = await customers.create({
      name: 'Taller Norte',
      rnc: '131123456',
    });
    const created = await seller.agent.post(ROOT).set(CSRF).send({ currency: 'USD' });
    expect(created.status).toBe(201);
    expect(created.body.currency).toBe('USD');

    const patched = await seller.agent
      .patch(`${ROOT}/${created.body.id}`)
      .set(CSRF)
      .send({ customerId: identified.id, fiscal: true });
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({
      currency: 'USD',
      fiscal: true,
      customer: { id: identified.id, rnc: '131123456', isDefault: false },
    });
    expect(await prisma.historyEvent.count({ where: { subjectId: created.body.id } })).toBe(2);
  });

  it('rejects fiscal drafts that use Cliente contado and discards only drafts', async () => {
    const admin = await fixture();
    const generic = await customers.findDefault();
    const conflict = await admin.agent.post(ROOT).set(CSRF).send({ fiscal: true });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.message).toBe(FISCAL_IDENTITY_REQUIRED_MESSAGE);

    const draft = await admin.agent.post(ROOT).set(CSRF).send({});
    const fiscalPatch = await admin.agent
      .patch(`${ROOT}/${draft.body.id}`)
      .set(CSRF)
      .send({ fiscal: true });
    expect(fiscalPatch.status).toBe(409);

    const discarded = await admin.agent.delete(`${ROOT}/${draft.body.id}`).set(CSRF);
    expect(discarded.status).toBe(204);
    expect((await admin.agent.get(`${ROOT}/${draft.body.id}`)).status).toBe(404);
    expect(
      await prisma.historyEvent.findFirst({
        where: { subjectId: draft.body.id, eventType: 'INVOICE_DRAFT_DISCARDED' },
      }),
    ).not.toBeNull();
    expect(await prisma.invoice.findUnique({ where: { id: draft.body.id } })).toBeNull();

    const completed = await prisma.invoice.create({
      data: {
        status: 'COMPLETED',
        currency: 'DOP',
        fiscal: false,
        customerId: generic!.id,
        number: `FAC-${randomUUID().slice(0, 6)}`,
      },
    });
    const blocked = await admin.agent.delete(`${ROOT}/${completed.id}`).set(CSRF);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.message).toBe(DRAFT_ONLY_DISCARD_MESSAGE);
    const blockedEdit = await admin.agent.patch(`${ROOT}/${completed.id}`).set(CSRF).send({
      currency: 'USD',
    });
    expect(blockedEdit.status).toBe(409);
    expect(blockedEdit.body.error.message).toBe(DRAFT_ONLY_EDIT_MESSAGE);
  });

  it('lists invoices with status filter and pagination', async () => {
    const admin = await fixture();
    const first = await admin.agent.post(ROOT).set(CSRF).send({ currency: 'DOP' });
    const second = await admin.agent.post(ROOT).set(CSRF).send({ currency: 'USD' });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const page = await admin.agent.get(`${ROOT}?page=1&pageSize=1&status=DRAFT`);
    expect(page.status).toBe(200);
    expect(page.body.total).toBe(2);
    expect(page.body.page).toBe(1);
    expect(page.body.pageSize).toBe(1);
    expect(page.body.items).toHaveLength(1);
    expect(page.body.items[0]).toMatchObject({ status: 'DRAFT', number: null });
    expect(page.body.items[0]).not.toHaveProperty('lines');
  });

  it('returns 403 for Mechanic and 400 for unknown fields', async () => {
    const mechanic = await fixture('MECHANIC');
    const admin = await fixture();
    expect((await mechanic.agent.get(ROOT)).status).toBe(403);
    expect((await mechanic.agent.post(ROOT).set(CSRF).send({})).status).toBe(403);
    const unknown = await admin.agent.post(ROOT).set(CSRF).send({ currency: 'DOP', extra: true });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.code).toBe('VALIDATION');
  });

  it('does not keep a draft when history append fails', async () => {
    const admin = await fixture();
    vi.spyOn(HistoryRepository.prototype, 'append').mockImplementation(async () => {
      throw new Error('history-unavailable');
    });
    await expect(service.createDraft(admin.user.id, {})).rejects.toThrow('history-unavailable');
    expect(await prisma.invoice.count()).toBe(0);
    expect(await prisma.historyEvent.count()).toBe(0);
  });

  it('rejects writes without the CSRF header', async () => {
    const admin = await fixture();
    expect((await admin.agent.post(ROOT).send({})).status).toBe(403);
  });
});

describe('M8 draft GENERIC lines (LINE-003)', () => {
  afterEach(cleanup);

  it('adds a fiscal GENERIC line, recalculates included ITBIS, then updates price and removes it', async () => {
    const seller = await fixture('SELLER');
    const identified = await customers.create({
      name: 'Taller Norte',
      rnc: '131123456',
    });
    const draft = await seller.agent
      .post(ROOT)
      .set(CSRF)
      .send({ customerId: identified.id, fiscal: true });
    expect(draft.status).toBe(201);

    const added = await seller.agent.post(`${ROOT}/${draft.body.id}/lines`).set(CSRF).send({
      type: 'GENERIC',
      description: 'Filtro de aceite',
      quantity: '2',
      unitPrice: '118.00',
      costProvenance: 'ACTUAL',
      acquisitionCostDop: '80.00',
    });
    expect(added.status).toBe(201);
    expect(added.body.lines).toHaveLength(1);
    expect(added.body.lines[0]).toMatchObject({
      type: 'GENERIC',
      description: 'Filtro de aceite',
      quantity: '2.00',
      unitPrice: '118.00',
      taxable: true,
      gross: '236.00',
      base: '200.00',
      itbis: '36.00',
      acquisitionCostDop: '80.00',
      costProvenance: 'ACTUAL',
      serviceId: null,
    });
    expect(added.body.totals).toEqual({ gross: '236.00', base: '200.00', itbis: '36.00' });
    expect(
      await prisma.historyEvent.findFirst({
        where: { subjectId: draft.body.id, eventType: 'INVOICE_LINE_ADDED' },
      }),
    ).not.toBeNull();

    const priced = await seller.agent
      .patch(`${ROOT}/${draft.body.id}/lines/${added.body.lines[0].id}`)
      .set(CSRF)
      .send({ unitPrice: '59.00' });
    expect(priced.status).toBe(200);
    expect(priced.body.lines[0]).toMatchObject({
      unitPrice: '59.00',
      gross: '118.00',
      base: '100.00',
      itbis: '18.00',
      acquisitionCostDop: '80.00',
    });
    expect(priced.body.totals).toEqual({ gross: '118.00', base: '100.00', itbis: '18.00' });

    const removed = await seller.agent
      .delete(`${ROOT}/${draft.body.id}/lines/${added.body.lines[0].id}`)
      .set(CSRF);
    expect(removed.status).toBe(200);
    expect(removed.body.lines).toEqual([]);
    expect(removed.body.totals).toEqual({ gross: '0.00', base: '0.00', itbis: '0.00' });
    expect(await prisma.invoiceLine.count({ where: { invoiceId: draft.body.id } })).toBe(0);
  });

  it('stores UNKNOWN cost as null, not zero, and rejects ITEM/QTY without inventory effects', async () => {
    const admin = await fixture();
    const draft = await admin.agent.post(ROOT).set(CSRF).send({});
    expect(draft.status).toBe(201);

    const unknown = await admin.agent.post(`${ROOT}/${draft.body.id}/lines`).set(CSRF).send({
      type: 'GENERIC',
      description: 'Varilla',
      unitPrice: '118.00',
      costProvenance: 'UNKNOWN',
    });
    expect(unknown.status).toBe(201);
    expect(unknown.body.lines[0]).toMatchObject({
      acquisitionCostDop: null,
      costProvenance: 'UNKNOWN',
      itbis: '0.00',
      gross: '118.00',
    });
    expect(unknown.body.lines[0].acquisitionCostDop).not.toBe('0.00');

    const item = await admin.agent
      .post(`${ROOT}/${draft.body.id}/lines`)
      .set(CSRF)
      .send({ type: 'ITEM', description: 'Tracked part', unitPrice: '10.00' });
    expect(item.status).toBe(409);
    expect(item.body.error.message).toBe(UNSUPPORTED_INVENTORY_LINE_MESSAGE);

    const qty = await admin.agent
      .post(`${ROOT}/${draft.body.id}/lines`)
      .set(CSRF)
      .send({ type: 'QTY', description: 'Bolts', unitPrice: '10.00' });
    expect(qty.status).toBe(409);
    expect(qty.body.error.message).toBe(UNSUPPORTED_INVENTORY_LINE_MESSAGE);
    expect(await prisma.invoiceLine.count({ where: { invoiceId: draft.body.id } })).toBe(1);

    const external = await admin.agent
      .post(`${ROOT}/${draft.body.id}/lines`)
      .set(CSRF)
      .send({ type: 'EXTERNAL', description: 'Bomba externa', unitPrice: '300.00' });
    expect(external.status).toBe(409);
    expect(external.body.error.message).toBe(UNSUPPORTED_LINE_TYPE_MESSAGE);
  });

  it('rejects negative prices, textual placeholders, completed invoices, Mechanic, and CSRF-less writes', async () => {
    const mechanic = await fixture('MECHANIC');
    const admin = await fixture();
    const generic = await customers.findDefault();
    const draft = await admin.agent.post(ROOT).set(CSRF).send({});

    const negative = await admin.agent.post(`${ROOT}/${draft.body.id}/lines`).set(CSRF).send({
      type: 'GENERIC',
      description: 'Filtro',
      unitPrice: '-1.00',
      costProvenance: 'UNKNOWN',
    });
    expect(negative.status).toBe(400);

    const placeholder = await admin.agent.post(`${ROOT}/${draft.body.id}/lines`).set(CSRF).send({
      type: 'GENERIC',
      description: 'Filtro',
      unitPrice: 'N/A',
      costProvenance: 'UNKNOWN',
    });
    expect(placeholder.status).toBe(400);
    expect(await prisma.invoiceLine.count({ where: { invoiceId: draft.body.id } })).toBe(0);

    expect(
      (
        await mechanic.agent.post(`${ROOT}/${draft.body.id}/lines`).set(CSRF).send({
          type: 'GENERIC',
          description: 'Filtro',
          unitPrice: '10.00',
          costProvenance: 'UNKNOWN',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await admin.agent.post(`${ROOT}/${draft.body.id}/lines`).send({
          type: 'GENERIC',
          description: 'Filtro',
          unitPrice: '10.00',
          costProvenance: 'UNKNOWN',
        })
      ).status,
    ).toBe(403);

    const completed = await prisma.invoice.create({
      data: {
        status: 'COMPLETED',
        currency: 'DOP',
        fiscal: false,
        customerId: generic!.id,
        number: `FAC-${randomUUID().slice(0, 6)}`,
      },
    });
    const blocked = await admin.agent.post(`${ROOT}/${completed.id}/lines`).set(CSRF).send({
      type: 'GENERIC',
      description: 'Filtro',
      unitPrice: '10.00',
      costProvenance: 'UNKNOWN',
    });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.message).toBe(DRAFT_ONLY_EDIT_MESSAGE);
  });

  it('does not keep a line when history append fails', async () => {
    const admin = await fixture();
    const draft = await admin.agent.post(ROOT).set(CSRF).send({});
    expect(draft.status).toBe(201);

    vi.spyOn(HistoryRepository.prototype, 'append').mockImplementation(async () => {
      throw new Error('history-unavailable');
    });
    await expect(
      service.addLine(admin.user.id, draft.body.id, {
        type: 'GENERIC',
        description: 'Filtro',
        unitPrice: '118.00',
        costProvenance: 'UNKNOWN',
      }),
    ).rejects.toThrow('history-unavailable');
    expect(await prisma.invoiceLine.count({ where: { invoiceId: draft.body.id } })).toBe(0);
  });
});

const SERVICES = '/api/catalogs/services';

describe('M9 draft SERVICE lines (LINE-004)', () => {
  afterEach(cleanup);

  it('lets Seller add an active catalog service with negotiated price and zero ITBIS', async () => {
    const admin = await fixture();
    const seller = await fixture('SELLER');
    const identified = await customers.create({
      name: 'Taller Norte',
      rnc: '131123456',
    });
    const catalog = await admin.agent
      .post(SERVICES)
      .set(CSRF)
      .send({ name: 'Instalación mecánica' });
    expect(catalog.status).toBe(201);

    const forbiddenCatalog = await seller.agent.post(SERVICES).set(CSRF).send({ name: 'Otro' });
    expect(forbiddenCatalog.status).toBe(403);

    const draft = await seller.agent
      .post(ROOT)
      .set(CSRF)
      .send({ customerId: identified.id, fiscal: true });
    expect(draft.status).toBe(201);

    const generic = await seller.agent.post(`${ROOT}/${draft.body.id}/lines`).set(CSRF).send({
      type: 'GENERIC',
      description: 'Filtro de aceite',
      unitPrice: '118.00',
      costProvenance: 'UNKNOWN',
    });
    expect(generic.status).toBe(201);

    const copiedName = await seller.agent
      .post(`${ROOT}/${draft.body.id}/lines`)
      .set(CSRF)
      .send({ type: 'SERVICE', serviceId: catalog.body.id, unitPrice: '500.00' });
    expect(copiedName.status).toBe(201);
    expect(copiedName.body.lines).toHaveLength(2);
    expect(copiedName.body.lines[1]).toMatchObject({
      type: 'SERVICE',
      description: 'Instalación mecánica',
      quantity: '1.00',
      unitPrice: '500.00',
      taxable: false,
      gross: '500.00',
      base: '500.00',
      itbis: '0.00',
      acquisitionCostDop: null,
      costProvenance: null,
      serviceId: catalog.body.id,
    });
    expect(copiedName.body.totals).toEqual({ gross: '618.00', base: '600.00', itbis: '18.00' });
    const serviceAddedEvent = await prisma.historyEvent.findFirst({
      where: {
        subjectId: draft.body.id,
        eventType: 'INVOICE_LINE_ADDED',
        payload: { path: ['serviceId'], equals: catalog.body.id },
      },
    });
    expect(serviceAddedEvent?.payload).toMatchObject({ serviceId: catalog.body.id });

    const overridden = await seller.agent.post(`${ROOT}/${draft.body.id}/lines`).set(CSRF).send({
      type: 'SERVICE',
      serviceId: catalog.body.id,
      unitPrice: '0.00',
      description: 'Instalación expres',
    });
    expect(overridden.status).toBe(201);
    expect(overridden.body.lines[2]).toMatchObject({
      type: 'SERVICE',
      description: 'Instalación expres',
      unitPrice: '0.00',
      itbis: '0.00',
      gross: '0.00',
      serviceId: catalog.body.id,
    });
    expect(overridden.body.totals).toEqual({ gross: '618.00', base: '600.00', itbis: '18.00' });

    const priced = await seller.agent
      .patch(`${ROOT}/${draft.body.id}/lines/${copiedName.body.lines[1].id}`)
      .set(CSRF)
      .send({ unitPrice: '250.00' });
    expect(priced.status).toBe(200);
    expect(priced.body.lines[1]).toMatchObject({
      unitPrice: '250.00',
      itbis: '0.00',
      gross: '250.00',
    });
    expect(priced.body.totals).toEqual({ gross: '368.00', base: '350.00', itbis: '18.00' });
  });

  it('rejects inactive and missing catalog services without inserting a line', async () => {
    const admin = await fixture();
    const draft = await admin.agent.post(ROOT).set(CSRF).send({});
    const inactive = await admin.agent
      .post(SERVICES)
      .set(CSRF)
      .send({ name: 'Diagnóstico', active: false });
    expect(inactive.status).toBe(201);

    const blocked = await admin.agent
      .post(`${ROOT}/${draft.body.id}/lines`)
      .set(CSRF)
      .send({ type: 'SERVICE', serviceId: inactive.body.id, unitPrice: '200.00' });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.message).toBe(INACTIVE_SERVICE_LINE_MESSAGE);
    expect(await prisma.invoiceLine.count({ where: { invoiceId: draft.body.id } })).toBe(0);

    const missing = await admin.agent.post(`${ROOT}/${draft.body.id}/lines`).set(CSRF).send({
      type: 'SERVICE',
      serviceId: '11111111-1111-4111-8111-111111111111',
      unitPrice: '200.00',
    });
    expect(missing.status).toBe(404);
    expect(missing.body.error.message).toBe(CATALOG_SERVICE_NOT_FOUND_MESSAGE);
    expect(await prisma.invoiceLine.count({ where: { invoiceId: draft.body.id } })).toBe(0);
  });

  it('rejects SERVICE payloads with quantity, cost, or extra fields', async () => {
    const admin = await fixture();
    const catalog = await admin.agent.post(SERVICES).set(CSRF).send({ name: 'Balanceo' });
    const draft = await admin.agent.post(ROOT).set(CSRF).send({});

    const withQuantity = await admin.agent.post(`${ROOT}/${draft.body.id}/lines`).set(CSRF).send({
      type: 'SERVICE',
      serviceId: catalog.body.id,
      unitPrice: '100.00',
      quantity: '2',
    });
    expect(withQuantity.status).toBe(400);

    const withCost = await admin.agent.post(`${ROOT}/${draft.body.id}/lines`).set(CSRF).send({
      type: 'SERVICE',
      serviceId: catalog.body.id,
      unitPrice: '100.00',
      costProvenance: 'UNKNOWN',
    });
    expect(withCost.status).toBe(400);
    expect(await prisma.invoiceLine.count({ where: { invoiceId: draft.body.id } })).toBe(0);
  });
});

describe('M10 draft DELIVERY lines (LINE-006)', () => {
  afterEach(cleanup);

  it('adds omitted-as-absent, free zero, and charged delivery without ITBIS', async () => {
    const seller = await fixture('SELLER');
    const identified = await customers.create({
      name: 'Taller Norte',
      rnc: '131123456',
    });
    const draft = await seller.agent
      .post(ROOT)
      .set(CSRF)
      .send({ customerId: identified.id, fiscal: true });
    expect(draft.status).toBe(201);
    expect(draft.body.lines).toEqual([]);
    expect(draft.body.totals).toEqual({ gross: '0.00', base: '0.00', itbis: '0.00' });

    const generic = await seller.agent.post(`${ROOT}/${draft.body.id}/lines`).set(CSRF).send({
      type: 'GENERIC',
      description: 'Filtro',
      unitPrice: '118.00',
      costProvenance: 'UNKNOWN',
    });
    expect(generic.status).toBe(201);
    expect(generic.body.totals).toEqual({ gross: '118.00', base: '100.00', itbis: '18.00' });

    const free = await seller.agent
      .post(`${ROOT}/${draft.body.id}/lines`)
      .set(CSRF)
      .send({ type: 'DELIVERY', description: 'Entrega incluida', unitPrice: '0.00' });
    expect(free.status).toBe(201);
    expect(free.body.lines).toHaveLength(2);
    expect(free.body.lines[1]).toMatchObject({
      type: 'DELIVERY',
      description: 'Entrega incluida',
      quantity: '1.00',
      unitPrice: '0.00',
      taxable: false,
      gross: '0.00',
      base: '0.00',
      itbis: '0.00',
      acquisitionCostDop: null,
      costProvenance: null,
      serviceId: null,
    });
    expect(free.body.totals).toEqual({ gross: '118.00', base: '100.00', itbis: '18.00' });

    const duplicate = await seller.agent
      .post(`${ROOT}/${draft.body.id}/lines`)
      .set(CSRF)
      .send({ type: 'DELIVERY', description: 'Envío', unitPrice: '200.00' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.message).toBe(DUPLICATE_DELIVERY_LINE_MESSAGE);
    expect(await prisma.invoiceLine.count({ where: { invoiceId: draft.body.id } })).toBe(2);

    const charged = await seller.agent
      .patch(`${ROOT}/${draft.body.id}/lines/${free.body.lines[1].id}`)
      .set(CSRF)
      .send({ unitPrice: '200.00' });
    expect(charged.status).toBe(200);
    expect(charged.body.lines[1]).toMatchObject({
      type: 'DELIVERY',
      unitPrice: '200.00',
      itbis: '0.00',
      gross: '200.00',
    });
    expect(charged.body.totals).toEqual({ gross: '318.00', base: '300.00', itbis: '18.00' });

    const removed = await seller.agent
      .delete(`${ROOT}/${draft.body.id}/lines/${free.body.lines[1].id}`)
      .set(CSRF);
    expect(removed.status).toBe(200);
    expect(removed.body.lines).toHaveLength(1);
    expect(removed.body.totals).toEqual({ gross: '118.00', base: '100.00', itbis: '18.00' });

    const restored = await seller.agent
      .post(`${ROOT}/${draft.body.id}/lines`)
      .set(CSRF)
      .send({ type: 'DELIVERY', description: 'Envío Santo Domingo', unitPrice: '150.00' });
    expect(restored.status).toBe(201);
    expect(restored.body.lines[1]).toMatchObject({
      type: 'DELIVERY',
      description: 'Envío Santo Domingo',
      unitPrice: '150.00',
      itbis: '0.00',
      gross: '150.00',
    });
    expect(restored.body.totals).toEqual({ gross: '268.00', base: '250.00', itbis: '18.00' });

    const addedEvent = await prisma.historyEvent.findFirst({
      where: {
        subjectId: draft.body.id,
        eventType: 'INVOICE_LINE_ADDED',
        payload: { path: ['type'], equals: 'DELIVERY' },
      },
      orderBy: { occurredAt: 'asc' },
    });
    expect(addedEvent?.payload).toMatchObject({ type: 'DELIVERY', unitPrice: '0.00' });
  });

  it('rejects missing descriptions, negative amounts, textual placeholders, quantity, and cost', async () => {
    const admin = await fixture();
    const draft = await admin.agent.post(ROOT).set(CSRF).send({});

    const withoutDescription = await admin.agent
      .post(`${ROOT}/${draft.body.id}/lines`)
      .set(CSRF)
      .send({ type: 'DELIVERY', unitPrice: '10.00' });
    expect(withoutDescription.status).toBe(400);

    const withEmptyDescription = await admin.agent
      .post(`${ROOT}/${draft.body.id}/lines`)
      .set(CSRF)
      .send({ type: 'DELIVERY', description: '   ', unitPrice: '10.00' });
    expect(withEmptyDescription.status).toBe(400);

    const negative = await admin.agent
      .post(`${ROOT}/${draft.body.id}/lines`)
      .set(CSRF)
      .send({ type: 'DELIVERY', description: 'Envío', unitPrice: '-1.00' });
    expect(negative.status).toBe(400);

    const placeholder = await admin.agent
      .post(`${ROOT}/${draft.body.id}/lines`)
      .set(CSRF)
      .send({ type: 'DELIVERY', description: 'Envío', unitPrice: 'N/A' });
    expect(placeholder.status).toBe(400);

    const withQuantity = await admin.agent
      .post(`${ROOT}/${draft.body.id}/lines`)
      .set(CSRF)
      .send({ type: 'DELIVERY', description: 'Envío', unitPrice: '10.00', quantity: '2' });
    expect(withQuantity.status).toBe(400);

    const withCost = await admin.agent.post(`${ROOT}/${draft.body.id}/lines`).set(CSRF).send({
      type: 'DELIVERY',
      description: 'Envío',
      unitPrice: '10.00',
      costProvenance: 'UNKNOWN',
    });
    expect(withCost.status).toBe(400);
    expect(await prisma.invoiceLine.count({ where: { invoiceId: draft.body.id } })).toBe(0);
  });
});
