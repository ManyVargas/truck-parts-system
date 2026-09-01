import { describe, expect, it } from 'vitest';

import { createInitialState } from '../../../../src/mocks/data/seed';
import { createManualWorkOrder } from '../../../../src/mocks/services/inventory-commands';
import {
  buildWorkOrderCreateOptions,
  buildWorkOrderList,
} from '../../../../src/mocks/services/work-order-catalog';
import {
  cancelOrder,
  createInstalacion,
  createManualDesarme,
  reassignOrder,
} from '../../../../src/mocks/services/work-order-commands';

const ADMIN = {
  id: 'U-ADMIN',
  name: 'Administrador Demo',
  username: 'admin',
  password: 'demo1234',
  role: 'ADMINISTRATOR' as const,
  active: true,
};

describe('work order catalog and commands', () => {
  it('projects seed orders with the expected statuses, types and links', () => {
    const rows = buildWorkOrderList(createInitialState());
    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));

    expect(rows).toHaveLength(4);
    expect(byId['OD-DEMO-060']).toMatchObject({
      type: 'DISMANTLING',
      status: 'IN_PROGRESS',
      pieceId: 'TUR-009',
      sourceParentId: 'ENG-001',
      assignedMechanicName: 'Pedro Santana',
      invoiceNumber: 'FAC-000096',
    });
    expect(byId['OD-DEMO-061']).toMatchObject({
      status: 'PENDING',
      assignedMechanicName: undefined,
      invoiceNumber: 'FAC-000098',
    });
    expect(byId['OD-DEMO-062']).toMatchObject({
      type: 'INSTALLATION',
      status: 'PENDING',
      destinationParentId: 'ENG-002',
    });
    expect(byId['OD-DEMO-063']).toMatchObject({
      status: 'COMPLETED',
      assignedMechanicName: 'Carlos Méndez',
    });
  });

  it('creates a pending dismantling without changing hierarchy', () => {
    const state = createInitialState();
    const piece = state.items.find((item) => item.id === 'ENG-001')!;
    const parentId = piece.parentId;
    const relationship = piece.physicalRelationship;

    const result = createManualDesarme(state, ADMIN, { pieceId: 'ENG-001' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.status).toBe('PENDING');
    expect(result.value.sourceParentId).toBe('TRK-001');
    expect(piece.parentId).toBe(parentId);
    expect(piece.physicalRelationship).toBe(relationship);
    expect(
      state.events.some(
        (event) => event.type === 'WORK_ORDER_CREATED' && event.metadata?.workOrderId === result.value.id,
      ),
    ).toBe(true);
  });

  it('creates a pending installation without attaching the piece yet', () => {
    const state = createInitialState();
    const piece = state.items.find((item) => item.id === 'ALT-010')!;

    const result = createInstalacion(state, ADMIN, {
      pieceId: 'ALT-010',
      destinationParentId: 'ENG-002',
    });

    expect(result.ok).toBe(true);
    expect(piece.physicalRelationship).toBe('INDEPENDENT');
    expect(piece.parentId).toBeUndefined();
  });

  it('reassigns a pending order to an active mechanic and records history', () => {
    const state = createInitialState();
    const result = reassignOrder(state, ADMIN, {
      workOrderId: 'OD-DEMO-061',
      mechanicId: 'U-PEDRO',
      reason: 'Cobertura de patio',
    });

    expect(result.ok).toBe(true);
    const order = state.workOrders.find((entry) => entry.id === 'OD-DEMO-061');
    expect(order?.assignedMechanicId).toBe('U-PEDRO');
    expect(order?.status).toBe('IN_PROGRESS');
    expect(
      state.events.some(
        (event) =>
          event.type === 'WORK_ORDER_REASSIGNED' &&
          event.metadata?.workOrderId === 'OD-DEMO-061' &&
          event.metadata?.reason === 'Cobertura de patio',
      ),
    ).toBe(true);
  });

  it('rejects reassignment to an inactive mechanic or a completed order', () => {
    const state = createInitialState();

    const inactive = reassignOrder(state, ADMIN, {
      workOrderId: 'OD-DEMO-061',
      mechanicId: 'U-CARLOS',
      reason: 'Intento',
    });
    const completed = reassignOrder(state, ADMIN, {
      workOrderId: 'OD-DEMO-063',
      mechanicId: 'U-PEDRO',
      reason: 'Intento',
    });

    expect(inactive.ok).toBe(false);
    expect(completed.ok).toBe(false);
  });

  it('cancels a pending order with reason and leaves inventory untouched', () => {
    const state = createInitialState();
    const piece = state.items.find((item) => item.id === 'FLT-001')!;
    const relationship = piece.physicalRelationship;

    const result = cancelOrder(state, ADMIN, {
      workOrderId: 'OD-DEMO-062',
      reason: 'Ya no aplica instalar',
    });

    expect(result.ok).toBe(true);
    expect(state.workOrders.find((order) => order.id === 'OD-DEMO-062')?.status).toBe('CANCELLED');
    expect(piece.physicalRelationship).toBe(relationship);
    expect(
      state.events.some(
        (event) =>
          event.type === 'WORK_ORDER_CANCELLED' && event.metadata?.workOrderId === 'OD-DEMO-062',
      ),
    ).toBe(true);
  });

  it('requires physical verification to cancel an in-progress order', () => {
    const state = createInitialState();

    const rejected = cancelOrder(state, ADMIN, {
      workOrderId: 'OD-DEMO-060',
      reason: 'Abandono',
    });
    const accepted = cancelOrder(state, ADMIN, {
      workOrderId: 'OD-DEMO-060',
      reason: 'Abandono verificado',
      physicalVerified: true,
    });

    expect(rejected.ok).toBe(false);
    expect(accepted.ok).toBe(true);
  });

  it('rejects cancelling a completed order', () => {
    const state = createInitialState();
    const result = cancelOrder(state, ADMIN, {
      workOrderId: 'OD-DEMO-063',
      reason: 'Borrar historial',
    });
    expect(result.ok).toBe(false);
    expect(state.workOrders.find((order) => order.id === 'OD-DEMO-063')?.status).toBe('COMPLETED');
  });

  it('omits pieces with an active order from create options', () => {
    const options = buildWorkOrderCreateOptions(createInitialState());
    const dismantlingIds = options.dismantlingPieces.map((piece) => piece.id);
    const installationIds = options.installationPieces.map((piece) => piece.id);

    expect(dismantlingIds).not.toContain('TUR-009');
    expect(dismantlingIds).not.toContain('STA-002');
    expect(installationIds).not.toContain('FLT-001');
    expect(options.mechanics.map((mechanic) => mechanic.id)).toEqual(['U-PEDRO']);
  });

  it('still uses the shared createManualWorkOrder path for inventory actions', () => {
    const state = createInitialState();
    const result = createManualWorkOrder(state, ADMIN, {
      pieceId: 'ENG-001',
      type: 'DISMANTLING',
    });
    expect(result.ok).toBe(true);
  });
});
