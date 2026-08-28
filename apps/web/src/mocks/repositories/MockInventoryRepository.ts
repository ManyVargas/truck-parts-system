import type { InventoryRepository } from '../../api/contracts/repositories';
import { err, ok } from '../../shared/auth/types';
import { cloneForRead, getMockState } from '../state';

export class MockInventoryRepository implements InventoryRepository {
  async listItems() {
    return ok(cloneForRead(getMockState().items));
  }

  async getItem(id: string) {
    const item = getMockState().items.find((entry) => entry.id === id);
    if (!item) {
      return err({ code: 'NOT_FOUND', message: 'Ítem no encontrado' });
    }
    return ok(cloneForRead(item));
  }

  async listQtyProducts() {
    return ok(cloneForRead(getMockState().qtyProducts));
  }

  async getQtyProduct(id: string) {
    const product = getMockState().qtyProducts.find((entry) => entry.id === id);
    if (!product) {
      return err({ code: 'NOT_FOUND', message: 'Producto no encontrado' });
    }
    return ok(cloneForRead(product));
  }
}

export const mockInventoryRepository = new MockInventoryRepository();
