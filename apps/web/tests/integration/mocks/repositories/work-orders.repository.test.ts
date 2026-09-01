import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mockWorkOrderRepository } from '../../../../src/mocks/repositories/MockWorkOrderRepository';
import { getMockState, resetMockState } from '../../../../src/mocks/state';
import { signInAs } from '../../../support/session';

describe('MockWorkOrderRepository', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  it('lists seed work orders for an administrator', async () => {
    signInAs('ADMINISTRATOR');

    const result = await mockWorkOrderRepository.list();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((row) => row.id).sort()).toEqual([
        'OD-DEMO-060',
        'OD-DEMO-061',
        'OD-DEMO-062',
        'OD-DEMO-063',
      ]);
    }
  });

  it('denies seller list, create, reassign and cancel', async () => {
    signInAs('SELLER');

    const listed = await mockWorkOrderRepository.list();
    const created = await mockWorkOrderRepository.createManual({
      pieceId: 'ENG-001',
      type: 'DISMANTLING',
    });
    const reassigned = await mockWorkOrderRepository.reassign({
      workOrderId: 'OD-DEMO-061',
      mechanicId: 'U-PEDRO',
      reason: 'No debería',
    });
    const cancelled = await mockWorkOrderRepository.cancel({
      workOrderId: 'OD-DEMO-062',
      reason: 'No debería',
    });

    expect(listed.ok).toBe(false);
    expect(created.ok).toBe(false);
    expect(reassigned.ok).toBe(false);
    expect(cancelled.ok).toBe(false);
    if (!listed.ok) {
      expect(listed.error.code).toBe('FORBIDDEN');
    }
  });

  it('creates a pending dismantling without changing hierarchy', async () => {
    signInAs('ADMINISTRATOR');

    const result = await mockWorkOrderRepository.createManual({
      pieceId: 'ENG-001',
      type: 'DISMANTLING',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('PENDING');
    }
    const piece = getMockState().items.find((item) => item.id === 'ENG-001');
    expect(piece?.parentId).toBe('TRK-001');
    expect(piece?.physicalRelationship).toBe('INSTALLED');
  });

  it('reassigns and cancels with history events', async () => {
    signInAs('ADMINISTRATOR');

    const reassigned = await mockWorkOrderRepository.reassign({
      workOrderId: 'OD-DEMO-061',
      mechanicId: 'U-PEDRO',
      reason: 'Cobertura',
    });
    const cancelled = await mockWorkOrderRepository.cancel({
      workOrderId: 'OD-DEMO-062',
      reason: 'Cambio de plan',
    });

    expect(reassigned.ok).toBe(true);
    expect(cancelled.ok).toBe(true);

    const state = getMockState();
    expect(state.workOrders.find((order) => order.id === 'OD-DEMO-061')?.assignedMechanicId).toBe(
      'U-PEDRO',
    );
    expect(state.workOrders.find((order) => order.id === 'OD-DEMO-062')?.status).toBe('CANCELLED');
    expect(state.events.some((event) => event.type === 'WORK_ORDER_REASSIGNED')).toBe(true);
    expect(state.events.some((event) => event.type === 'WORK_ORDER_CANCELLED')).toBe(true);
  });

  it('lets a mechanic read the projected queue but not manage desktop orders', async () => {
    signInAs('MECHANIC');

    const queue = await mockWorkOrderRepository.listForMechanic();
    const listed = await mockWorkOrderRepository.list();

    expect(queue.ok).toBe(true);
    expect(listed.ok).toBe(false);
    if (queue.ok) {
      expect(queue.value[0]).not.toHaveProperty('invoiceId');
      expect(queue.value[0]).not.toHaveProperty('invoiceNumber');
    }
  });

  it('returns defensive copies for list reads', async () => {
    signInAs('ADMINISTRATOR');

    const first = await mockWorkOrderRepository.list();
    expect(first.ok).toBe(true);
    if (first.ok) {
      first.value[0]!.pieceName = 'Mutación externa';
    }

    const second = await mockWorkOrderRepository.list();
    expect(second.ok && second.value[0]?.pieceName).not.toBe('Mutación externa');
  });
});
