import type { InventoryRepository } from '../../api/contracts/repositories';
import type { InventoryListFilters } from '../../api/contracts/inventory';
import { err, ok } from '../../shared/auth/types';
import {
  buildInventoryCatalog,
  buildItemDetail,
  buildQtyProductDetail,
} from '../services/inventory-catalog';
import {
  addInventoryToDraft,
  correctAcquisitionCost,
  correctReceiptBaseline,
  createManualWorkOrder,
  registerAssembly,
  registerItem,
  registerQtyProduct,
  receiveQtyStock,
  adjustQtyStock,
  resolveCatalogReview,
  setNoDesarmar,
  updateItemDetails,
  updateQtyProductDetails,
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
      return err({ code: 'NOT_FOUND', message: 'Pieza no encontrada' });
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

  async correctAcquisitionCost(
    input: Parameters<InventoryRepository['correctAcquisitionCost']>[0],
  ) {
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

  async correctReceiptBaseline(
    input: Parameters<InventoryRepository['correctReceiptBaseline']>[0],
  ) {
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

  async resolveCatalogReview(input: Parameters<InventoryRepository['resolveCatalogReview']>[0]) {
    const permission = requirePermission('inventory.admin');
    if (!permission.ok) {
      return permission;
    }

    const result = resolveCatalogReview(getMockState(), permission.value, input);
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

  async registerItem(input: Parameters<InventoryRepository['registerItem']>[0]) {
    const permission = requirePermission('inventory.register');
    if (!permission.ok) return permission;
    const result = registerItem(getMockState(), permission.value, input);
    return result.ok ? ok(cloneForRead(result.value)) : result;
  }

  async updateItemDetails(input: Parameters<InventoryRepository['updateItemDetails']>[0]) {
    const permission = requirePermission('inventory.register');
    if (!permission.ok) return permission;
    const result = updateItemDetails(getMockState(), permission.value, input);
    return result.ok ? ok(cloneForRead(result.value)) : result;
  }

  async registerAssembly(input: Parameters<InventoryRepository['registerAssembly']>[0]) {
    const permission = requirePermission('inventory.register');
    if (!permission.ok) return permission;
    const result = registerAssembly(getMockState(), permission.value, input);
    return result.ok ? ok(cloneForRead(result.value)) : result;
  }

  async registerQtyProduct(input: Parameters<InventoryRepository['registerQtyProduct']>[0]) {
    const permission = requirePermission('inventory.register');
    if (!permission.ok) return permission;
    const result = registerQtyProduct(getMockState(), permission.value, input);
    return result.ok ? ok(cloneForRead(result.value)) : result;
  }

  async updateQtyProductDetails(
    input: Parameters<InventoryRepository['updateQtyProductDetails']>[0],
  ) {
    const permission = requirePermission('inventory.register');
    if (!permission.ok) return permission;
    const result = updateQtyProductDetails(getMockState(), permission.value, input);
    return result.ok ? ok(cloneForRead(result.value)) : result;
  }

  async receiveQtyStock(input: Parameters<InventoryRepository['receiveQtyStock']>[0]) {
    const permission = requirePermission('inventory.register');
    if (!permission.ok) return permission;
    const result = receiveQtyStock(getMockState(), permission.value, input);
    return result.ok ? ok(cloneForRead(result.value)) : result;
  }

  async adjustQtyStock(input: Parameters<InventoryRepository['adjustQtyStock']>[0]) {
    const permission = requirePermission('inventory.admin');
    if (!permission.ok) return permission;
    const result = adjustQtyStock(getMockState(), permission.value, input);
    return result.ok ? ok(cloneForRead(result.value)) : result;
  }
}

export const mockInventoryRepository = new MockInventoryRepository();
