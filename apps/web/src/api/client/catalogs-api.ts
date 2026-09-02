import type { Category, Service } from '../contracts/entities';
import type { SaveCategoryInput, SaveServiceInput } from '../contracts/catalogs';
import type { Result } from '../../shared/auth/types';

/**
 * Future HTTP catalogs client (API categories + mechanical services).
 * Features consume CategoryRepository / ServiceRepository.
 */
export async function listCategoriesWithHttp(): Promise<Result<Category[]>> {
  throw new Error('HttpCategoryRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function saveCategoryWithHttp(
  _input: SaveCategoryInput,
): Promise<Result<Category>> {
  throw new Error('HttpCategoryRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function listServicesWithHttp(): Promise<Result<Service[]>> {
  throw new Error('HttpServiceRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function saveServiceWithHttp(_input: SaveServiceInput): Promise<Result<Service>> {
  throw new Error('HttpServiceRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}
