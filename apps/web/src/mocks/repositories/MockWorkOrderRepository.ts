import type { MechanicWorkOrderView, WorkOrder } from '../../api/contracts/entities';
import type { WorkOrderRepository } from '../../api/contracts/repositories';
import type {
  CancelWorkOrderInput,
  CreateManualWorkOrderInput,
  ReassignWorkOrderInput,
  WorkOrderListTab,
} from '../../api/contracts/work-orders';
import { err, ok } from '../../shared/auth/types';
import { createManualWorkOrder } from '../services/inventory-commands';
import { requirePermission } from '../services/require-permission';
import {
  buildWorkOrderCreateOptions,
  buildWorkOrderDetail,
  buildWorkOrderList,
  findWorkOrder,
} from '../services/work-order-catalog';
import { cancelOrder, reassignOrder } from '../services/work-order-commands';
import { cloneForRead, getMockState } from '../state';

function toMechanicView(order: WorkOrder): MechanicWorkOrderView {
  const state = getMockState();
  const piece = state.items.find((item) => item.id === order.pieceId);

  return {
    id: order.id,
    type: order.type,
    status: order.status,
    pieceId: order.pieceId,
    pieceName: piece?.name ?? order.pieceId,
    sourceParentId: order.sourceParentId,
    destinationParentId: order.destinationParentId,
    effectiveLocation: piece?.location,
    notes: order.notes,
    beforePhotos: [...order.beforePhotos],
    afterPhotos: [...order.afterPhotos],
  };
}

export class MockWorkOrderRepository implements WorkOrderRepository {
  async list(tab: WorkOrderListTab = 'ALL') {
    const permission = requirePermission('workOrders.manage');
    if (!permission.ok) {
      return permission;
    }

    return ok(cloneForRead(buildWorkOrderList(getMockState(), tab)));
  }

  async getById(id: string) {
    const permission = requirePermission('workOrders.manage');
    if (!permission.ok) {
      return permission;
    }

    const order = findWorkOrder(getMockState(), id);
    if (!order) {
      return err({ code: 'NOT_FOUND', message: 'OT no encontrada' });
    }

    return ok(cloneForRead(buildWorkOrderDetail(getMockState(), order, permission.value)));
  }

  async listForMechanic() {
    const permission = requirePermission('workOrders.take');
    if (!permission.ok) {
      return permission;
    }

    const views = getMockState().workOrders.map(toMechanicView);
    return ok(cloneForRead(views));
  }

  async getCreateOptions() {
    const permission = requirePermission('workOrders.manage');
    if (!permission.ok) {
      return permission;
    }

    return ok(cloneForRead(buildWorkOrderCreateOptions(getMockState())));
  }

  async createManual(input: CreateManualWorkOrderInput) {
    const permission = requirePermission('workOrders.manage');
    if (!permission.ok) {
      return permission;
    }

    const result = createManualWorkOrder(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(buildWorkOrderDetail(getMockState(), result.value, permission.value)));
  }

  async reassign(input: ReassignWorkOrderInput) {
    const permission = requirePermission('workOrders.manage');
    if (!permission.ok) {
      return permission;
    }

    const result = reassignOrder(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(buildWorkOrderDetail(getMockState(), result.value, permission.value)));
  }

  async cancel(input: CancelWorkOrderInput) {
    const permission = requirePermission('workOrders.manage');
    if (!permission.ok) {
      return permission;
    }

    const result = cancelOrder(getMockState(), permission.value, input);
    if (!result.ok) {
      return result;
    }

    return ok(cloneForRead(buildWorkOrderDetail(getMockState(), result.value, permission.value)));
  }
}

export const mockWorkOrderRepository = new MockWorkOrderRepository();
