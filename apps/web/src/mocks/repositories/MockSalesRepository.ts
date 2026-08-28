import type { SalesRepository } from '../../api/contracts/repositories';
import { err, ok } from '../../shared/auth/types';
import { cloneForRead, getMockState } from '../state';

export class MockSalesRepository implements SalesRepository {
  async listInvoices() {
    return ok(cloneForRead(getMockState().invoices));
  }

  async getInvoice(id: string) {
    const invoice = getMockState().invoices.find((entry) => entry.id === id);
    if (!invoice) {
      return err({ code: 'NOT_FOUND', message: 'Factura no encontrada' });
    }
    return ok(cloneForRead(invoice));
  }
}

export const mockSalesRepository = new MockSalesRepository();
