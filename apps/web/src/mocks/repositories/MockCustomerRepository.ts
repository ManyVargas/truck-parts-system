import type { Customer } from '../../api/contracts/entities';
import type { CustomerRepository } from '../../api/contracts/repositories';
import { ok } from '../../shared/auth/types';
import { getMockState } from '../state';

export class MockCustomerRepository implements CustomerRepository {
  async list() {
    return ok(getMockState().customers);
  }

  async search(query: string) {
    const normalized = query.trim().toLowerCase();
    const customers = getMockState().customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(normalized) ||
        customer.rnc?.includes(normalized),
    );
    return ok(customers);
  }

  async getById(id: string) {
    const customer = getMockState().customers.find((entry) => entry.id === id);
    if (!customer) {
      return { ok: false as const, error: { code: 'NOT_FOUND' as const, message: 'Cliente no encontrado' } };
    }
    return ok(customer);
  }

  async save(customer: Customer) {
    return ok(customer);
  }
}

export const mockCustomerRepository = new MockCustomerRepository();
