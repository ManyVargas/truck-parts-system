import type { InventoryRepository } from '../../api/contracts/repositories';
import type { InventoryListFilters } from '../../api/contracts/inventory';
import { err, ok } from '../../shared/auth/types';
import { buildInventoryCatalog, buildItemDetail, buildQtyProductDetail } from '../services/inventory-catalog';
import {
  addInventoryToDraft,
  correctAcquisitionCost,
  correctReceiptBaseline,
  createManualWorkOrder,
  setNoDesarmar,
} from '../services/inventory-commands';
import { requirePermission } from '../services/require-permission';
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

  async listCatalog(filters: InventoryListFilters = {}) {
    const permission = requirePermission('inventory.view');
    if (!permission.ok) {
      return permission;
    }

    return ok(cloneForRead(buildInventoryCatalog(getMockState(), filters)));
  }

  async getDetail(id: string) {
    const permission = requirePermission('inventory.view');
    if (!permission.ok) {
      return permission;
    }

    const state = getMockState();
    const itemDetail = buildItemDetail(state, id);
    if (itemDetail) {
      return ok(cloneForRead(itemDetail));
    }

    const qtyDetail = buildQtyProductDetail(state, id);
    if (qtyDetail) {
      return ok(cloneForRead(qtyDetail));
    }

    return err({ code: 'NOT_FOUND', message: 'Inventario no encontrado' });
  }

  async addToDraft(input: Parameters<InventoryRepository['addToDraft']>[0]) {
    const permission = requirePermission('sales.manage');
    if (!permission.ok) {
      return permission;
    }

    const result = addInventoryToDraft(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(result.value));
  }

  async setNoDesarmar(input: Parameters<InventoryRepository['setNoDesarmar']>[0]) {
    const permission = requirePermission('inventory.admin');
    if (!permission.ok) {
      return permission;
    }

    const result = setNoDesarmar(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(result.value));
  }

  async correctAcquisitionCost(input: Parameters<InventoryRepository['correctAcquisitionCost']>[0]) {
    const permission = requirePermission('inventory.admin');
    if (!permission.ok) {
      return permission;
    }

    const result = correctAcquisitionCost(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(result.value));
  }

  async correctReceiptBaseline(input: Parameters<InventoryRepository['correctReceiptBaseline']>[0]) {
    const permission = requirePermission('inventory.admin');
    if (!permission.ok) {
      return permission;
    }

    const result = correctReceiptBaseline(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(result.value));
  }

  async createManualWorkOrder(input: Parameters<InventoryRepository['createManualWorkOrder']>[0]) {
    const permission = requirePermission('workOrders.manage');
    if (!permission.ok) {
      return permission;
    }

    const result = createManualWorkOrder(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(result.value));
  }
}

export const mockInventoryRepository = new MockInventoryRepository();
