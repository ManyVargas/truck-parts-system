import {
  DEFAULT_CASH_CUSTOMER_ID,
  type CustomerListRow,
  type SaveCustomerInput,
} from '../../api/contracts/customers';
import type { AppState, Customer } from '../../api/contracts/entities';
import { err, ok, type Result } from '../../shared/auth/types';

const CUSTOMER_ID_PATTERN = /^C(\d+)$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function matchesQuery(customer: Customer, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    customer.name.toLowerCase().includes(normalized) ||
    (customer.rnc?.toLowerCase().includes(normalized) ?? false)
  );
}

function invoiceCountFor(state: AppState, customerId: string): number {
  return state.invoices.filter((invoice) => invoice.customerId === customerId).length;
}

function sortDirectory(rows: CustomerListRow[]): CustomerListRow[] {
  return [...rows].sort((left, right) => {
    if (left.isDefault && !right.isDefault) {
      return -1;
    }
    if (!left.isDefault && right.isDefault) {
      return 1;
    }
    return left.name.localeCompare(right.name, 'es');
  });
}

/** Directory rows with invoice counts; search is name or RNC/Cédula only. */
export function buildCustomerDirectory(state: AppState, query = ''): CustomerListRow[] {
  const rows = state.customers.filter((customer) => matchesQuery(customer, query)).map((customer) => ({
    ...customer,
    invoiceCount: invoiceCountFor(state, customer.id),
  }));

  return sortDirectory(rows);
}

export function nextCustomerId(customers: Customer[]): string {
  let maxIndex = 0;

  for (const customer of customers) {
    const match = CUSTOMER_ID_PATTERN.exec(customer.id);
    if (!match) {
      continue;
    }
    maxIndex = Math.max(maxIndex, Number(match[1]));
  }

  return `C${maxIndex + 1}`;
}

function isProtectedCashCustomer(customer: Customer | undefined, id: string | undefined): boolean {
  return id === DEFAULT_CASH_CUSTOMER_ID || customer?.isDefault === true;
}

/**
 * Validates create/edit and returns the record to upsert.
 * Caller persists; this function does not mutate state.
 */
export function prepareCustomerSave(
  customers: Customer[],
  input: SaveCustomerInput,
): Result<Customer> {
  const name = input.name.trim();
  if (!name) {
    return err({ code: 'VALIDATION', message: 'El nombre es obligatorio' });
  }

  const email = optionalText(input.email);
  if (email && !EMAIL_PATTERN.test(email)) {
    return err({ code: 'VALIDATION', message: 'El correo no es válido' });
  }

  const existing = input.id ? customers.find((entry) => entry.id === input.id) : undefined;

  if (input.id && !existing) {
    return err({ code: 'NOT_FOUND', message: 'Cliente no encontrado' });
  }

  if (isProtectedCashCustomer(existing, input.id)) {
    return err({
      code: 'VALIDATION',
      message: 'Cliente Contado es el predeterminado y no se puede editar',
    });
  }

  const customer: Customer = {
    id: existing?.id ?? nextCustomerId(customers),
    name,
    rnc: optionalText(input.rnc),
    phone: optionalText(input.phone),
    email,
    address: optionalText(input.address),
    notes: optionalText(input.notes),
  };

  return ok(customer);
}
