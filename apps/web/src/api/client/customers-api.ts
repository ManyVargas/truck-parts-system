import type { CustomerListRow, SaveCustomerInput } from '../contracts/customers';
import type { Customer } from '../contracts/entities';
import type { Result } from '../../shared/auth/types';

/**
 * Future HTTP customers client.
 * Features consume CustomerRepository; this module is the swap target for MockCustomerRepository.
 */
export async function listCustomersWithHttp(): Promise<Result<CustomerListRow[]>> {
  throw new Error('HttpCustomerRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function saveCustomerWithHttp(
  _input: SaveCustomerInput,
): Promise<Result<Customer>> {
  throw new Error('HttpCustomerRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}
