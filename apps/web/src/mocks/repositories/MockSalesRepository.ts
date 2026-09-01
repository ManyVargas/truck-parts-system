import type { SalesRepository } from '../../api/contracts/repositories';
import type {
  AddPaymentInput,
  CancelInvoiceInput,
  CorrectCurrencyInput,
  SalesListTab,
} from '../../api/contracts/sales';
import { err, ok } from '../../shared/auth/types';
import { addPayment, cancelInvoice, correctCurrency } from '../services/sales-commands';
import { buildInvoiceDetail, buildSalesList } from '../services/sales-catalog';
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
}

export const mockSalesRepository = new MockSalesRepository();
