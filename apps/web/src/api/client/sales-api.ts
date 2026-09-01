import type { Result } from '../../shared/auth/types';
import type {
  AddPaymentInput,
  CancelInvoiceInput,
  CorrectCurrencyInput,
  InvoiceDetailView,
  SalesListRow,
  SalesListTab,
} from '../contracts/sales';

/**
 * Future HTTP sales client.
 * Features consume SalesRepository; this module is the swap target for MockSalesRepository.
 */
export async function listInvoicesWithHttp(
  _tab?: SalesListTab,
): Promise<Result<SalesListRow[]>> {
  throw new Error('HttpSalesRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function getInvoiceWithHttp(_id: string): Promise<Result<InvoiceDetailView>> {
  throw new Error('HttpSalesRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function addPaymentWithHttp(
  _input: AddPaymentInput,
): Promise<Result<InvoiceDetailView>> {
  throw new Error('HttpSalesRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function cancelInvoiceWithHttp(
  _input: CancelInvoiceInput,
): Promise<Result<InvoiceDetailView>> {
  throw new Error('HttpSalesRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function correctCurrencyWithHttp(
  _input: CorrectCurrencyInput,
): Promise<Result<InvoiceDetailView>> {
  throw new Error('HttpSalesRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}
