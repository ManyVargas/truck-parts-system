import { describe, expect, it } from 'vitest';

import { createInitialState } from '../../../../src/mocks/data/seed';
import {
  addDraftLine,
  confirmInvoice,
  createDraft,
  discardDraft,
  setDraftLinePrice,
  setDraftMeta,
} from '../../../../src/mocks/services/sales-commands';
import { buildInvoiceDetail } from '../../../../src/mocks/services/sales-catalog';
import { invoiceItbis, invoiceTotal } from '../../../../src/mocks/services/invoice-money';

const seller = createInitialState().users.find((user) => user.id === 'U-LAURA')!;
const admin = createInitialState().users.find((user) => user.id === 'U-ADMIN')!;

describe('POS draft commands', () => {
  it('confirms the seed draft as FAC-000100 and opens a pending dismantling WO', () => {
    const state = createInitialState();
    const result = confirmInvoice(state, seller, 'INV-DRAFT-01');

    expect(result.ok).toBe(true);
    const invoice = state.invoices.find((entry) => entry.id === 'INV-DRAFT-01')!;
    expect(invoice.status).toBe('COMPLETED');
    expect(invoice.number).toBe('FAC-000100');
    expect(state.facSeq).toBe(101);

    const alternator = state.items.find((item) => item.id === 'ALT-004')!;
    expect(alternator.commercialState).toBe('SOLD');
    expect(alternator.physicalRelationship).toBe('INSTALLED');
    expect(alternator.parentId).toBe('ENG-001');
    expect(alternator.reservedByDraftId).toBeUndefined();

    const oil = state.qtyProducts.find((product) => product.id === 'QTY-OIL-15W40')!;
    expect(oil.onHand).toBe(46);
    expect(oil.reserved).toBe(0);

    const wo = state.workOrders.find((order) => order.id === 'OD-DEMO-064');
    expect(wo).toMatchObject({
      type: 'DISMANTLING',
      status: 'PENDING',
      pieceId: 'ALT-004',
      invoiceId: 'INV-DRAFT-01',
    });
  });

  it('is idempotent: a second confirm does not consume another FAC number', () => {
    const state = createInitialState();
    expect(confirmInvoice(state, seller, 'INV-DRAFT-01').ok).toBe(true);
    const second = confirmInvoice(state, seller, 'INV-DRAFT-01');

    expect(second.ok).toBe(true);
    expect(state.invoices.filter((entry) => entry.number === 'FAC-000100')).toHaveLength(1);
    expect(state.invoices.some((entry) => entry.number === 'FAC-000101')).toBe(false);
    expect(state.facSeq).toBe(101);
  });

  it('keeps ITBIS at 0 without fiscal flag and extracts included ITBIS when enabled', () => {
    const state = createInitialState();
    const draft = state.invoices.find((entry) => entry.id === 'INV-DRAFT-01')!;

    expect(invoiceTotal(draft)).toBe(31_600);
    expect(invoiceItbis(draft)).toBe(0);

    const fiscal = setDraftMeta(state, seller, { draftId: 'INV-DRAFT-01', fiscal: true });
    expect(fiscal.ok).toBe(true);
    expect(invoiceTotal(draft)).toBe(31_600);
    expect(invoiceItbis(draft)).toBeGreaterThan(0);
  });

  it('rejects fiscal mode on Cliente Contado', () => {
    const state = createInitialState();
    const created = createDraft(state, seller);
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const result = setDraftMeta(state, seller, { draftId: created.value.draftId, fiscal: true });
    expect(result.ok).toBe(false);
  });

  it('rejects a No desarmar descendant as a loose line', () => {
    const state = createInitialState();
    const result = addDraftLine(state, seller, {
      draftId: 'INV-DRAFT-01',
      type: 'ITEM',
      itemId: 'ALT-011',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('ENG-003');
    }
  });

  it('rejects an item reserved by another draft', () => {
    const state = createInitialState();
    const created = createDraft(state, seller);
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    expect(
      addDraftLine(state, seller, {
        draftId: created.value.draftId,
        type: 'ITEM',
        itemId: 'FLT-001',
      }).ok,
    ).toBe(true);

    const conflict = addDraftLine(state, seller, {
      draftId: 'INV-DRAFT-01',
      type: 'ITEM',
      itemId: 'FLT-001',
    });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) {
      expect(conflict.error.code).toBe('CONFLICT');
    }
  });

  it('blocks confirmation while prices are pending', () => {
    const state = createInitialState();
    expect(
      addDraftLine(state, seller, {
        draftId: 'INV-DRAFT-01',
        type: 'ITEM',
        itemId: 'FLT-001',
      }).ok,
    ).toBe(true);

    const result = confirmInvoice(state, seller, 'INV-DRAFT-01');
    expect(result.ok).toBe(false);
    expect(state.invoices.find((entry) => entry.id === 'INV-DRAFT-01')?.status).toBe('DRAFT');
  });

  it('blocks confirming an assembly with active work in the subtree', () => {
    const state = createInitialState();
    const created = createDraft(state, seller);
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    const draftId = created.value.draftId;

    const added = addDraftLine(state, seller, { draftId, type: 'ITEM', itemId: 'ENG-002' });
    expect(added.ok).toBe(true);
    expect(setDraftLinePrice(state, seller, { draftId, lineId: 'L-D1', unitPrice: 50_000 }).ok).toBe(
      true,
    );

    const result = confirmInvoice(state, seller, draftId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('OD-DEMO-062');
    }
    expect(state.items.find((item) => item.id === 'ENG-002')?.commercialState).toBe('AVAILABLE');
  });

  it('blocks confirming ENG-001 while descendant dismantling is active', () => {
    const state = createInitialState();
    expect(
      addDraftLine(state, seller, {
        draftId: 'INV-DRAFT-01',
        type: 'ITEM',
        itemId: 'ENG-001',
      }).ok,
    ).toBe(false);

    const created = createDraft(state, seller);
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    delete state.items.find((item) => item.id === 'ALT-004')!.reservedByDraftId;
    const draftId = created.value.draftId;
    expect(addDraftLine(state, seller, { draftId, type: 'ITEM', itemId: 'ENG-001' }).ok).toBe(true);
    const lineId = state.invoices.find((entry) => entry.id === draftId)!.lines[0]!.id;
    expect(setDraftLinePrice(state, seller, { draftId, lineId, unitPrice: 200_000 }).ok).toBe(true);

    const result = confirmInvoice(state, seller, draftId);
    expect(result.ok).toBe(false);
  });

  it('preserves the customer snapshot after the live customer is edited', () => {
    const state = createInitialState();
    expect(confirmInvoice(state, seller, 'INV-DRAFT-01').ok).toBe(true);

    const customer = state.customers.find((entry) => entry.id === 'C1')!;
    customer.name = 'Nombre cambiado';

    const invoice = state.invoices.find((entry) => entry.id === 'INV-DRAFT-01')!;
    const detail = buildInvoiceDetail(state, invoice, admin);
    expect(detail.customerName).toBe('Transportes del Caribe SRL');
    expect(invoice.customerSnapshot?.name).toBe('Transportes del Caribe SRL');
  });

  it('releases reservations when a draft is discarded', () => {
    const state = createInitialState();
    expect(discardDraft(state, seller, 'INV-DRAFT-01').ok).toBe(true);

    expect(state.invoices.some((entry) => entry.id === 'INV-DRAFT-01')).toBe(false);
    expect(state.items.find((item) => item.id === 'ALT-004')?.reservedByDraftId).toBeUndefined();
    expect(state.qtyProducts.find((product) => product.id === 'QTY-OIL-15W40')?.reserved).toBe(0);
  });
});
