import type { InventoryRepository } from '../../api/contracts/repositories';
import { ok } from '../../shared/auth/types';
import { getMockState } from '../state';

export class MockInventoryRepository implements InventoryRepository {
  async listItems() {
    return ok(getMockState().items);
  }

  async getItem(id: string) {
    const item = getMockState().items.find((entry) => entry.id === id);
    if (!item) {
      return { ok: false as const, error: { code: 'NOT_FOUND' as const, message: 'Ítem no encontrado' } };
    }
    return ok(item);
  }

  async listQtyProducts() {
    return ok(getMockState().qtyProducts);
  }

  async getQtyProduct(id: string) {
    const product = getMockState().qtyProducts.find((entry) => entry.id === id);
    if (!product) {
      return { ok: false as const, error: { code: 'NOT_FOUND' as const, message: 'Producto no encontrado' } };
    }
    return ok(product);
  }
}

export const mockInventoryRepository = new MockInventoryRepository();
