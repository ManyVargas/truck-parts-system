import type {
  AddToDraftInput,
  AddToDraftResult,
  InventoryDetail,
  InventoryListFilters,
  InventoryListRow,
} from '../contracts/inventory';
import type { Result } from '../../shared/auth/types';

/**
 * Future HTTP inventory client.
 * Features consume InventoryRepository; this module is the swap target for MockInventoryRepository.
 */
export async function listInventoryCatalogWithHttp(
  _filters?: InventoryListFilters,
): Promise<Result<InventoryListRow[]>> {
  throw new Error('HttpInventoryRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function getInventoryDetailWithHttp(_id: string): Promise<Result<InventoryDetail>> {
  throw new Error('HttpInventoryRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function addInventoryToDraftWithHttp(
  _input: AddToDraftInput,
): Promise<Result<AddToDraftResult>> {
  throw new Error('HttpInventoryRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}
