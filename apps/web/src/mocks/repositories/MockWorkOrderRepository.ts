import type { MechanicWorkOrderView, WorkOrder } from '../../api/contracts/entities';
import type { WorkOrderRepository } from '../../api/contracts/repositories';
import { ok } from '../../shared/auth/types';
import { getMockState } from '../state';

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
    beforePhotos: order.beforePhotos,
    afterPhotos: order.afterPhotos,
  };
}

export class MockWorkOrderRepository implements WorkOrderRepository {
  async list() {
    return ok(getMockState().workOrders);
  }

  async getById(id: string) {
    const order = getMockState().workOrders.find((entry) => entry.id === id);
    if (!order) {
      return { ok: false as const, error: { code: 'NOT_FOUND' as const, message: 'OT no encontrada' } };
    }
    return ok(order);
  }

  async listForMechanic() {
    const views = getMockState().workOrders.map(toMechanicView);
    return ok(views);
  }
}

export const mockWorkOrderRepository = new MockWorkOrderRepository();
