import type { SalesRepository } from '../../api/contracts/repositories';
import type {
  AddDraftLineInput,
  AddPaymentInput,
  CancelInvoiceInput,
  CorrectCurrencyInput,
  RemoveDraftLineInput,
  SalesListTab,
  SetDraftLinePriceInput,
  SetDraftMetaInput,
} from '../../api/contracts/sales';
import { err, ok } from '../../shared/auth/types';
import {
  addDraftLine,
  addPayment,
  cancelInvoice,
  confirmInvoice,
  correctCurrency,
  createDraft,
  discardDraft,
  removeDraftLine,
  setDraftLinePrice,
  setDraftMeta,
} from '../services/sales-commands';
import { buildInvoiceDetail, buildSalesList } from '../services/sales-catalog';
import { buildPosDraftView } from '../services/sales-draft';
import { requirePermission } from '../services/require-permission';
import { cloneForRead, getMockState } from '../state';

export class MockSalesRepository implements SalesRepository {
  async listInvoices(tab: SalesListTab = 'ALL') {
    const permission = requirePermission('sales.manage');
    if (!permission.ok) {
      return permission;
    }

    return ok(cloneForRead(buildSalesList(getMockState(), tab)));
  }

  async getInvoice(id: string) {
    const permission = requirePermission('sales.manage');
    if (!permission.ok) {
      return permission;
    }

    const invoice = getMockState().invoices.find((entry) => entry.id === id);
    if (!invoice) {
      return err({ code: 'NOT_FOUND', message: 'Factura no encontrada' });
    }

    return ok(cloneForRead(buildInvoiceDetail(getMockState(), invoice, permission.value)));
  }

  async addPayment(input: AddPaymentInput) {
    const permission = requirePermission('sales.manage');
    if (!permission.ok) {
      return permission;
    }

    const result = addPayment(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(buildInvoiceDetail(getMockState(), result.value, permission.value)));
  }

  async cancelInvoice(input: CancelInvoiceInput) {
    const permission = requirePermission('sales.cancel');
    if (!permission.ok) {
      return permission;
    }

    const result = cancelInvoice(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(buildInvoiceDetail(getMockState(), result.value, permission.value)));
  }

  async correctCurrency(input: CorrectCurrencyInput) {
    const permission = requirePermission('sales.correctCurrency');
    if (!permission.ok) {
      return permission;
    }

    const result = correctCurrency(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(buildInvoiceDetail(getMockState(), result.value, permission.value)));
  }

  async createDraft() {
    const permission = requirePermission('sales.manage');
    if (!permission.ok) {
      return permission;
    }

    const result = createDraft(getMockState(), permission.value);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(result.value));
  }

  async getDraft(id: string) {
    const permission = requirePermission('sales.manage');
    if (!permission.ok) {
      return permission;
    }

    const invoice = getMockState().invoices.find((entry) => entry.id === id);
    if (!invoice) {
      return err({ code: 'NOT_FOUND', message: 'Borrador no encontrado' });
    }

    return ok(cloneForRead(buildPosDraftView(getMockState(), invoice)));
  }

  async addLine(input: AddDraftLineInput) {
    const permission = requirePermission('sales.manage');
    if (!permission.ok) {
      return permission;
    }

    const result = addDraftLine(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(buildPosDraftView(getMockState(), result.value)));
  }

  async removeLine(input: RemoveDraftLineInput) {
    const permission = requirePermission('sales.manage');
    if (!permission.ok) {
      return permission;
    }

    const result = removeDraftLine(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(buildPosDraftView(getMockState(), result.value)));
  }

  async setLinePrice(input: SetDraftLinePriceInput) {
    const permission = requirePermission('sales.manage');
    if (!permission.ok) {
      return permission;
    }

    const result = setDraftLinePrice(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(buildPosDraftView(getMockState(), result.value)));
  }

  async setDraftMeta(input: SetDraftMetaInput) {
    const permission = requirePermission('sales.manage');
    if (!permission.ok) {
      return permission;
    }

    const result = setDraftMeta(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(buildPosDraftView(getMockState(), result.value)));
  }

  async confirmInvoice(draftId: string) {
    const permission = requirePermission('sales.manage');
    if (!permission.ok) {
      return permission;
    }

    const result = confirmInvoice(getMockState(), permission.value, draftId);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(buildPosDraftView(getMockState(), result.value)));
  }

  async discardDraft(draftId: string) {
    const permission = requirePermission('sales.manage');
    if (!permission.ok) {
      return permission;
    }

    return discardDraft(getMockState(), permission.value, draftId);
  }
}

export const mockSalesRepository = new MockSalesRepository();
