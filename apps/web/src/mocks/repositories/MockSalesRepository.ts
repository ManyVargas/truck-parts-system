import type { SalesRepository } from '../../api/contracts/repositories';
import { ok } from '../../shared/auth/types';
import { getMockState } from '../state';

export class MockSalesRepository implements SalesRepository {
  async listInvoices() {
    return ok(getMockState().invoices);
  }

  async getInvoice(id: string) {
    const invoice = getMockState().invoices.find((entry) => entry.id === id);
    if (!invoice) {
      return { ok: false as const, error: { code: 'NOT_FOUND' as const, message: 'Factura no encontrada' } };
    }
    return ok(invoice);
  }
}

export const mockSalesRepository = new MockSalesRepository();
