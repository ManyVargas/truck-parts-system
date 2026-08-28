import type { Category } from '../../api/contracts/entities';
import type { CategoryRepository } from '../../api/contracts/repositories';
import { ok } from '../../shared/auth/types';
import { getMockState } from '../state';

export class MockCategoryRepository implements CategoryRepository {
  async list() {
    return ok(getMockState().categories);
  }

  async save(category: Category) {
    return ok(category);
  }
}

export const mockCategoryRepository = new MockCategoryRepository();
