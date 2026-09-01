import type { Result } from '../../shared/auth/types';
import type {
  AddDraftLineInput,
  AddPaymentInput,
  CancelInvoiceInput,
  CorrectCurrencyInput,
  CreateDraftResult,
  InvoiceDetailView,
  PosDraftView,
  RemoveDraftLineInput,
  SalesListRow,
  SalesListTab,
  SetDraftLinePriceInput,
  SetDraftMetaInput,
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

export async function createDraftWithHttp(): Promise<Result<CreateDraftResult>> {
  throw new Error('HttpSalesRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function getDraftWithHttp(_id: string): Promise<Result<PosDraftView>> {
  throw new Error('HttpSalesRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function addDraftLineWithHttp(
  _input: AddDraftLineInput,
): Promise<Result<PosDraftView>> {
  throw new Error('HttpSalesRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function removeDraftLineWithHttp(
  _input: RemoveDraftLineInput,
): Promise<Result<PosDraftView>> {
  throw new Error('HttpSalesRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function setDraftLinePriceWithHttp(
  _input: SetDraftLinePriceInput,
): Promise<Result<PosDraftView>> {
  throw new Error('HttpSalesRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function setDraftMetaWithHttp(
  _input: SetDraftMetaInput,
): Promise<Result<PosDraftView>> {
  throw new Error('HttpSalesRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function confirmInvoiceWithHttp(_draftId: string): Promise<Result<PosDraftView>> {
  throw new Error('HttpSalesRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function discardDraftWithHttp(_draftId: string): Promise<Result<void>> {
  throw new Error('HttpSalesRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}
