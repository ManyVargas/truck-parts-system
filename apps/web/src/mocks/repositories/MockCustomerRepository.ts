import type { Customer } from '../../api/contracts/entities';
import type { CustomerRepository } from '../../api/contracts/repositories';
import { err, ok } from '../../shared/auth/types';
import { cloneForRead, getMockState } from '../state';

export class MockCustomerRepository implements CustomerRepository {
  async list() {
    return ok(cloneForRead(getMockState().customers));
  }

  async search(query: string) {
    const normalized = query.trim().toLowerCase();
    const customers = getMockState().customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(normalized) ||
        customer.rnc?.includes(normalized),
    );
    return ok(cloneForRead(customers));
  }

  async getById(id: string) {
    const customer = getMockState().customers.find((entry) => entry.id === id);
    if (!customer) {
      return err({ code: 'NOT_FOUND', message: 'Cliente no encontrado' });
    }
    return ok(cloneForRead(customer));
  }

  async save(customer: Customer) {
    return ok(cloneForRead(customer));
  }
}

export const mockCustomerRepository = new MockCustomerRepository();
