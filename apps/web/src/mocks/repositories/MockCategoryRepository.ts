import type { Category } from '../../api/contracts/entities';
import type { CategoryRepository } from '../../api/contracts/repositories';
import { ok } from '../../shared/auth/types';
import { cloneForRead, getMockState } from '../state';

export class MockCategoryRepository implements CategoryRepository {
  async list() {
    return ok(cloneForRead(getMockState().categories));
  }

  async save(category: Category) {
    return ok(cloneForRead(category));
  }
}

export const mockCategoryRepository = new MockCategoryRepository();
