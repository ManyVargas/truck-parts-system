import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mockInventoryRepository } from '../../../../src/mocks/repositories/MockInventoryRepository';
import { getMockState, resetMockState } from '../../../../src/mocks/state';
import { signInAs } from '../../../support/session';

describe('MockInventoryRepository', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  it('denies mechanic catalog access', async () => {
    signInAs('MECHANIC');

    const result = await mockInventoryRepository.listCatalog();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('lets sellers reserve inventory but denies administrative mutations', async () => {
    signInAs('SELLER');

    const added = await mockInventoryRepository.addToDraft({ itemId: 'FLT-001' });
    const noDesarmar = await mockInventoryRepository.setNoDesarmar({
      itemId: 'ENG-002',
      enabled: true,
    });
    const cost = await mockInventoryRepository.correctAcquisitionCost({
      itemId: 'FLT-001',
      acquisitionCostDop: 900,
      reason: 'Corrección',
    });
    const workOrder = await mockInventoryRepository.createManualWorkOrder({
      pieceId: 'ALT-010',
      type: 'INSTALLATION',
      destinationParentId: 'ENG-002',
    });

    expect(added.ok).toBe(true);
    expect(noDesarmar.ok).toBe(false);
    expect(cost.ok).toBe(false);
    expect(workOrder.ok).toBe(false);
  });

  it('prevents applying No desarmar to a unique part', async () => {
    signInAs('ADMINISTRATOR');

    const result = await mockInventoryRepository.setNoDesarmar({
      itemId: 'FLT-001',
      enabled: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('does not erase a post-baseline removal through baseline correction', async () => {
    signInAs('ADMINISTRATOR');

    const result = await mockInventoryRepository.correctReceiptBaseline({
      itemId: 'ENG-002',
      reason: 'Intento incorrecto',
      markNotApplicable: ['Alternador'],
    });

    expect(result.ok).toBe(false);
    expect(
      getMockState().knownMissing.some(
        (entry) =>
          entry.expectedComponentName === 'Alternador' && entry.origin === 'REMOVED_AFTER_BASELINE',
      ),
    ).toBe(true);
  });

  it('records additive history for administrator cost corrections', async () => {
    signInAs('ADMINISTRATOR');

    const result = await mockInventoryRepository.correctAcquisitionCost({
      itemId: 'FLT-001',
      acquisitionCostDop: 900,
      costProvenance: 'Factura corregida',
      reason: 'Error de digitación',
    });

    expect(result.ok).toBe(true);
    const event = getMockState().events.find((entry) => entry.type === 'COST_CORRECTED');
    expect(event?.metadata).toMatchObject({
      itemId: 'FLT-001',
      reason: 'Error de digitación',
      after: 900,
      afterCostProvenance: 'Factura corregida',
    });
  });

  it('corrects reception baseline without deleting other missing components', async () => {
    signInAs('ADMINISTRATOR');

    const result = await mockInventoryRepository.correctReceiptBaseline({
      itemId: 'ENG-002',
      reason: 'El turbo no aplica a esta unidad',
      markNotApplicable: ['Turbo'],
    });

    expect(result.ok).toBe(true);
    expect(
      getMockState().knownMissing.some((entry) => entry.expectedComponentName === 'Turbo'),
    ).toBe(false);
    expect(
      getMockState().knownMissing.some((entry) => entry.expectedComponentName === 'Alternador'),
    ).toBe(true);
    expect(getMockState().items.find((item) => item.id === 'ENG-002')?.complete).toBe(false);
  });

  it('creates a pending manual work order without changing physical hierarchy', async () => {
    signInAs('ADMINISTRATOR');

    const result = await mockInventoryRepository.createManualWorkOrder({
      pieceId: 'ENG-001',
      type: 'DISMANTLING',
    });

    expect(result.ok && result.value.status).toBe('PENDING');
    const piece = getMockState().items.find((item) => item.id === 'ENG-001');
    expect(piece?.parentId).toBe('TRK-001');
    expect(piece?.physicalRelationship).toBe('INSTALLED');
  });

  it('returns defensive copies for catalog and detail reads', async () => {
    signInAs('SELLER');

    const first = await mockInventoryRepository.getDetail('FLT-001');
    expect(first.ok).toBe(true);
    if (first.ok && first.value.kind === 'ITEM') {
      first.value.name = 'Mutación externa';
    }
    const second = await mockInventoryRepository.getDetail('FLT-001');

    expect(second.ok && second.value.name).toBe('Filtro de aceite HD');
  });
});
