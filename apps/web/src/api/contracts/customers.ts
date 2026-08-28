import type { Customer } from './entities';

/** Seed and runtime id of the generic cash customer (CUST-002). */
export const DEFAULT_CASH_CUSTOMER_ID = 'C0';

export type CustomerListRow = Customer & {
  invoiceCount: number;
};

export type SaveCustomerInput = {
  id?: string;
  name: string;
  rnc?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};
