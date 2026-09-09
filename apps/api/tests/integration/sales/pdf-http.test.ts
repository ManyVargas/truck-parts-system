import { randomUUID } from 'node:crypto';

import type { Role } from '@prisma/client';
import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { hashPassword } from '../../../src/features/access/password.js';
import { resetLoginRateLimit } from '../../../src/features/access/login-rate-limit.js';
import {
  PDF_COMPLETED_ONLY_MESSAGE,
  PDF_FAILED_MESSAGE,
} from '../../../src/features/invoice-documents/constants.js';
import { UserRepository } from '../../../src/features/users/repository.js';
import {
  INVOICE_PDF_NCF_FIELD,
  failingInvoicePdfRenderer,
} from '../../../src/infrastructure/invoice-pdf/index.js';
import { disconnectPrisma, prisma } from '../../../src/infrastructure/database/index.js';
import { createTestApp } from '../../helpers/app.js';
import { clearTestHistory } from '../../helpers/history.js';

const users = new UserRepository();
const PASSWORD = 'personal-password';
const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };
const SALES = '/api/sales';

async function fixture(agent: request.Agent, role: Role = 'ADMINISTRATOR') {
  const user = await users.create({
    name: 'Fixture',
    username: randomUUID(),
    role,
    passwordHash: await hashPassword(PASSWORD),
  });
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
  await prisma.invoiceSequence.update({
    where: { name: 'FAC' },
    data: { nextValue: 1 },
  });
  await prisma.customerContact.deleteMany({ where: { customer: { isDefault: false } } });
  await prisma.customer.deleteMany({ where: { isDefault: false } });
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

afterAll(disconnectPrisma);

async function confirmGeneric(agent: request.Agent) {
  const draft = await agent.post(SALES).set(CSRF).send({});
  expect(draft.status).toBe(201);
  expect(
    (
      await agent.post(`${SALES}/${draft.body.id}/lines`).set(CSRF).send({
        type: 'GENERIC',
        description: 'Filtro',
        unitPrice: '118.00',
        costProvenance: 'UNKNOWN',
      })
    ).status,
  ).toBe(201);
  const confirmed = await agent.post(`${SALES}/${draft.body.id}/confirm`).set(CSRF).send({});
  expect(confirmed.status).toBe(200);
  return confirmed.body;
}

describe('M17 PDF generate + failed status (SALE-004)', () => {
  afterEach(cleanup);

  it('keeps the sale when PDF generation fails and does not retry on idempotent confirm', async () => {
    const app = createTestApp({ invoicePdfRenderer: failingInvoicePdfRenderer });
    const admin = await fixture(request.agent(app));
    const invoice = await confirmGeneric(admin.agent);

    expect(invoice).toMatchObject({
      status: 'COMPLETED',
      number: 'FAC-000001',
      document: { status: 'FAILED' },
    });
    expect(invoice.document.errorId).toEqual(expect.any(String));
    const stored = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(stored).toMatchObject({
      status: 'COMPLETED',
      number: 'FAC-000001',
      pdfStatus: 'FAILED',
      pdfErrorId: invoice.document.errorId,
    });

    const pdf = await admin.agent.get(`${SALES}/${invoice.id}/pdf`);
    expect(pdf.status).toBe(409);
    expect(pdf.body.error.message).toBe(PDF_FAILED_MESSAGE);
    expect(pdf.body.error.details.errorId).toBe(invoice.document.errorId);

    const retry = await admin.agent.post(`${SALES}/${invoice.id}/confirm`).set(CSRF).send({});
    expect(retry.status).toBe(200);
    expect(retry.body.number).toBe('FAC-000001');
    expect(retry.body.document.errorId).toBe(invoice.document.errorId);
    expect(
      await prisma.historyEvent.count({
        where: { subjectId: invoice.id, eventType: 'INVOICE_CONFIRMED' },
      }),
    ).toBe(1);
    expect(
      await prisma.historyEvent.count({
        where: { subjectId: invoice.id, eventType: 'INVOICE_PDF_FAILED' },
      }),
    ).toBe(1);
    expect(
      await prisma.historyEvent.count({
        where: { subjectId: invoice.id, eventType: 'INVOICE_PDF_GENERATED' },
      }),
    ).toBe(0);
  });

  it('lets Seller download a READY PDF that contains FAC- and a blank NCF field', async () => {
    const app = createTestApp();
    const seller = await fixture(request.agent(app), 'SELLER');
    const invoice = await confirmGeneric(seller.agent);
    expect(invoice.document).toEqual({ status: 'READY' });

    const pdf = await seller.agent.get(`${SALES}/${invoice.id}/pdf`).buffer(true);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toMatch(/application\/pdf/);
    expect(pdf.headers['content-disposition']).toContain('FAC-000001.pdf');
    const body = Buffer.from(pdf.body);
    const text = body.toString('latin1');
    expect(text.slice(0, 5)).toBe('%PDF-');
    expect(text).toContain('(FAC-000001)');
    expect(text).toContain(`(${INVOICE_PDF_NCF_FIELD})`);

    expect(
      await prisma.historyEvent.count({
        where: { subjectId: invoice.id, eventType: 'INVOICE_PDF_GENERATED' },
      }),
    ).toBe(1);
  });

  it('keeps PDF metadata valid when a completed invoice becomes cancelled', async () => {
    const app = createTestApp();
    const admin = await fixture(request.agent(app));
    const invoice = await confirmGeneric(admin.agent);

    await expect(
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'CANCELLED' },
      }),
    ).resolves.toMatchObject({
      status: 'CANCELLED',
      pdfStatus: 'READY',
      pdfTemplateVersion: 'internal-v1',
    });
  });

  it('passes the persisted template version to the renderer on download', async () => {
    const render = vi.fn().mockResolvedValue(Buffer.from('%PDF-versioned'));
    const app = createTestApp({ invoicePdfRenderer: { render } });
    const admin = await fixture(request.agent(app));
    const invoice = await confirmGeneric(admin.agent);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfTemplateVersion: 'internal-legacy' },
    });

    const pdf = await admin.agent.get(`${SALES}/${invoice.id}/pdf`).buffer(true);

    expect(pdf.status).toBe(200);
    expect(render).toHaveBeenLastCalledWith(
      expect.objectContaining({ templateVersion: 'internal-legacy' }),
    );
  });

  it('rejects Mechanic and draft PDF downloads', async () => {
    const app = createTestApp();
    const admin = await fixture(request.agent(app));
    const mechanic = await fixture(request.agent(app), 'MECHANIC');
    const draft = await admin.agent.post(SALES).set(CSRF).send({});
    expect(draft.status).toBe(201);

    const draftPdf = await admin.agent.get(`${SALES}/${draft.body.id}/pdf`);
    expect(draftPdf.status).toBe(409);
    expect(draftPdf.body.error.message).toBe(PDF_COMPLETED_ONLY_MESSAGE);

    const invoice = await confirmGeneric(admin.agent);
    const denied = await mechanic.agent.get(`${SALES}/${invoice.id}/pdf`);
    expect(denied.status).toBe(403);
  });
});
