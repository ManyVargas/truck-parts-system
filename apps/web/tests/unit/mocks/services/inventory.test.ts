import { describe, expect, it } from 'vitest';

import { createInitialState } from '../../../../src/mocks/data/seed';
import type { RegisterQtyProductInput } from '../../../../src/api/contracts/inventory';
import {
  buildInventoryCatalog,
  buildItemDetail,
  buildQtyProductDetail,
} from '../../../../src/mocks/services/inventory-catalog';
import {
  addInventoryToDraft,
  correctAcquisitionCost,
  createManualWorkOrder,
  registerAssembly,
  registerItem,
  registerQtyProduct,
} from '../../../../src/mocks/services/inventory-commands';
import {
  availableToReserve,
  effectiveLocation,
  isComplete,
  protectedAncestor,
} from '../../../../src/mocks/services/inventory-helpers';

const SELLER = {
  id: 'U-LAURA',
  name: 'Laura Pérez',
  username: 'laura',
  password: 'demo1234',
  role: 'SELLER' as const,
  active: true,
};

describe('inventory helpers', () => {
  const state = createInitialState();

  it('inherits effective location from the truck root for installed descendants', () => {
    const alt = state.items.find((item) => item.id === 'ALT-004');
    expect(alt).toBeDefined();
    expect(effectiveLocation(state.items, alt!)).toBe('Patio A');
    expect(alt!.location).toBeUndefined();
  });

  it('uses the independent item location', () => {
    const filter = state.items.find((item) => item.id === 'FLT-001');
    expect(effectiveLocation(state.items, filter!)).toBe('Estante 3');
  });

  it('does not treat unique parts as complete or incomplete', () => {
    const alt = state.items.find((item) => item.id === 'ALT-004');
    expect(isComplete(alt!, state.knownMissing, state.categories)).toBeUndefined();
  });

  it('keeps ENG-001 complete while sold turbos remain installed pending desarme', () => {
    const engine = state.items.find((item) => item.id === 'ENG-001');
    const turbo = state.items.find((item) => item.id === 'TUR-009');
    expect(turbo?.commercialState).toBe('SOLD');
    expect(turbo?.physicalRelationship).toBe('INSTALLED');
    expect(turbo?.parentId).toBe('ENG-001');
    expect(isComplete(engine!, state.knownMissing, state.categories)).toBe(true);

    const detail = buildItemDetail(state, 'ENG-001');
    expect(detail?.soldInstalledChildren.map((child) => child.id).sort()).toEqual([
      'STA-002',
      'TUR-009',
    ]);
  });

  it('records a completed desarme as independent without erasing former parent', () => {
    const alt = state.items.find((item) => item.id === 'ALT-010');
    expect(alt?.physicalRelationship).toBe('INDEPENDENT');
    expect(alt?.parentId).toBeUndefined();
    const detail = buildItemDetail(state, 'ALT-010');
    expect(detail?.formerInstallation).toMatchObject({
      parentId: 'ENG-002',
      workOrderId: 'OD-DEMO-063',
    });
  });

  it('marks ENG-002 incomplete because of the missing turbo', () => {
    const engine = state.items.find((item) => item.id === 'ENG-002');
    expect(isComplete(engine!, state.knownMissing, state.categories)).toBe(false);
    expect(state.knownMissing.some((entry) => entry.parentId === 'ENG-002')).toBe(true);
  });

  it('HIER-008: applies No desarmar to real descendants of ENG-003', () => {
    const engine = state.items.find((item) => item.id === 'ENG-003')!;
    const descendant = state.items.find((item) => item.id === 'ALT-011')!;

    expect(protectedAncestor(state.items, descendant)?.id).toBe('ENG-003');
    expect(protectedAncestor(state.items, engine)?.id).toBe('ENG-003');
  });

  it('HIER-007: a missing engine component does not change truck completeness', () => {
    const truck = state.items.find((item) => item.id === 'TRK-001')!;
    const engine = state.items.find((item) => item.id === 'ENG-001')!;
    const truckBefore = isComplete(truck, state.knownMissing, state.categories);
    const patchedMissing = [
      ...state.knownMissing,
      {
        id: 'KM-TEST',
        parentId: 'ENG-001',
        expectedComponentName: 'Sensor',
        origin: 'MISSING_AT_RECEIPT' as const,
      },
    ];

    expect(isComplete(engine, patchedMissing, state.categories)).toBe(false);
    expect(isComplete(truck, patchedMissing, state.categories)).toBe(truckBefore);
  });

  it('QTY-002: computes quantity available as onHand minus reserved', () => {
    const oil = state.qtyProducts.find((product) => product.id === 'QTY-OIL-15W40')!;
    expect(availableToReserve(oil.onHand, oil.reserved)).toBe(46);
  });
});

describe('buildInventoryCatalog', () => {
  const state = createInitialState();

  it('hides sold items until the historical toggle is on', () => {
    const available = buildInventoryCatalog(state, { includeSold: false });
    expect(available.some((row) => row.id === 'TUR-009')).toBe(false);

    const withSold = buildInventoryCatalog(state, { includeSold: true });
    expect(withSold.some((row) => row.id === 'TUR-009')).toBe(true);
  });

  it('searches across id, name, serial and part number', () => {
    expect(buildInventoryCatalog(state, { query: 'DD15' }).map((row) => row.id)).toContain(
      'ENG-001',
    );
    expect(buildInventoryCatalog(state, { query: 'LF9009' }).map((row) => row.id)).toEqual([
      'FLT-001',
    ]);
    expect(buildInventoryCatalog(state, { query: '15W-40' }).map((row) => row.id)).toEqual([
      'QTY-OIL-15W40',
    ]);
    expect(buildInventoryCatalog(state, { query: '14.8L' }).map((row) => row.id)).toEqual([
      'ENG-001',
    ]);
  });

  it('omits completeness on unique-part catalog rows', () => {
    const alt = buildInventoryCatalog(state).find((row) => row.id === 'ALT-004');
    expect(alt?.isAssembly).toBe(false);
    expect(alt?.complete).toBeUndefined();
  });

  it('filters by category and includes quantity products', () => {
    const rows = buildInventoryCatalog(state, { categoryId: 'CAT-OIL' });
    expect(rows.map((row) => row.id)).toEqual(['QTY-OIL-15W40']);
  });
});

describe('detail projections', () => {
  const state = createInitialState();

  it('exposes a physically valid TRK-001 tree with one engine and a missing transmission', () => {
    const detail = buildItemDetail(state, 'TRK-001');
    expect(detail?.tree.id).toBe('TRK-001');
    expect(detail?.complete).toBe(false);
    expect(detail?.tree.children.map((child) => child.id)).toEqual(['ENG-001']);
    expect(detail?.tree.missingSlots.map((slot) => slot.name)).toEqual(['Transmisión']);
    expect(detail?.tree.children.some((child) => child.id === 'ENG-002')).toBe(false);
    expect(detail?.tree.children.some((child) => child.id === 'ENG-003')).toBe(false);
  });

  it('keeps ENG-002 and ENG-003 as independent yard engines', () => {
    const isx = state.items.find((item) => item.id === 'ENG-002');
    const dd13 = state.items.find((item) => item.id === 'ENG-003');
    expect(isx?.physicalRelationship).toBe('INDEPENDENT');
    expect(isx?.parentId).toBeUndefined();
    expect(dd13?.physicalRelationship).toBe('INDEPENDENT');
    expect(dd13?.parentId).toBeUndefined();
    expect(buildItemDetail(state, 'ENG-002')?.tree.id).toBe('ENG-002');
    expect(buildItemDetail(state, 'ENG-003')?.tree.id).toBe('ENG-003');
    expect(buildItemDetail(state, 'ENG-003')?.tree.children.map((child) => child.id)).toEqual([
      'ALT-011',
    ]);
  });

  it('shows an installed engine with its truck parent and only its own descendants', () => {
    const detail = buildItemDetail(state, 'ENG-001');
    expect(detail?.tree.id).toBe('TRK-001');
    expect(detail?.tree.missingSlots).toEqual([]);
    expect(detail?.tree.children.map((child) => child.id)).toEqual(['ENG-001']);
    const engine = detail?.tree.children[0];
    expect(engine?.children.map((child) => child.id).sort()).toEqual([
      'ALT-004',
      'STA-002',
      'TUR-009',
    ]);
  });

  it('shows an installed part with parent engine and no sibling parts', () => {
    const detail = buildItemDetail(state, 'ALT-004');
    expect(detail?.tree.id).toBe('TRK-001');
    const engine = detail?.tree.children[0];
    expect(engine?.id).toBe('ENG-001');
    expect(engine?.children.map((child) => child.id)).toEqual(['ALT-004']);
    expect(engine?.children.some((child) => child.id === 'STA-002')).toBe(false);
  });

  it('shows ENG-002 missing turbo and incomplete', () => {
    const detail = buildItemDetail(state, 'ENG-002');
    expect(detail?.complete).toBe(false);
    expect(detail?.missingComponents.map((entry) => entry.expectedComponentName)).toEqual([
      'Turbo',
      'Alternador',
    ]);
  });

  it('HIER-008: blocks separate sale of a No desarmar descendant', () => {
    const detail = buildItemDetail(state, 'ALT-011');
    expect(detail?.draftEligibility.allowed).toBe(false);
    expect(detail?.protectedRootId).toBe('ENG-003');
    expect(detail?.effectiveLocation).toBe('Patio C');
  });

  it('allows selling the protected root as a unit', () => {
    const detail = buildItemDetail(state, 'ENG-003');
    expect(detail?.draftEligibility.allowed).toBe(true);
    expect(detail?.noDesarmar).toBe(true);
  });

  it('RES-001: overlapping ancestor is not draft-eligible while a descendant is reserved', () => {
    const detail = buildItemDetail(state, 'ENG-001');
    expect(detail?.draftEligibility.allowed).toBe(false);
  });

  it('projects quantity availability', () => {
    const detail = buildQtyProductDetail(state, 'QTY-OIL-15W40');
    expect(detail?.availableToReserve).toBe(46);
    expect(detail?.onHand).toBe(48);
    expect(detail?.reserved).toBe(2);
  });
});

describe('inventory commands', () => {
  it('registers an individual item while keeping unknown cost absent', () => {
    const state = createInitialState();
    const result = registerItem(state, SELLER, {
      id: 'ALT-020',
      name: 'Alternador de prueba',
      categoryId: 'CAT-ALT',
      condition: 'USED',
      attributes: { voltaje: '24V' },
      photos: ['frente.jpg'],
    });

    expect(result.ok).toBe(true);
    expect(state.items.find((item) => item.id === 'ALT-020')).toMatchObject({
      commercialState: 'AVAILABLE',
      physicalRelationship: 'INDEPENDENT',
      attributes: { voltaje: '24V' },
    });
    expect(state.items.find((item) => item.id === 'ALT-020')).not.toHaveProperty(
      'acquisitionCostDop',
    );
  });

  it('registers quantity inventory with initial stock and zero reservation', () => {
    const state = createInitialState();
    const result = registerQtyProduct(state, SELLER, {
      id: 'QTY-FIL-NEW',
      name: 'Filtro nuevo por caja',
      categoryId: 'CAT-FIL',
      initialQuantity: 12,
      unitCostDop: 450,
      location: 'Estante 8',
    });

    expect(result.ok).toBe(true);
    expect(state.qtyProducts.find((product) => product.id === 'QTY-FIL-NEW')).toMatchObject({
      onHand: 12,
      reserved: 0,
      unitCostDop: 450,
    });
  });

  it('registers an assembly parent, present children and receipt missing slots atomically', () => {
    const state = createInitialState();
    const result = registerAssembly(state, SELLER, {
      parent: {
        id: 'ENG-020',
        name: 'Motor recibido',
        categoryId: 'CAT-ENG',
        condition: 'USED',
        location: 'Patio D',
      },
      baseline: [
        {
          expectedComponentName: 'Alternador',
          status: 'PRESENT',
          item: {
            id: 'ALT-020',
            name: 'Alternador instalado',
            categoryId: 'CAT-ALT',
            condition: 'USED',
          },
        },
        { expectedComponentName: 'Turbo', status: 'MISSING' },
        { expectedComponentName: 'Motor de arranque', status: 'NOT_APPLICABLE' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(state.items.find((item) => item.id === 'ENG-020')?.complete).toBe(false);
    expect(state.items.find((item) => item.id === 'ALT-020')).toMatchObject({
      parentId: 'ENG-020',
      physicalRelationship: 'INSTALLED',
    });
    expect(state.knownMissing).toContainEqual(
      expect.objectContaining({
        parentId: 'ENG-020',
        expectedComponentName: 'Turbo',
        origin: 'MISSING_AT_RECEIPT',
      }),
    );
    expect(
      state.knownMissing.some(
        (entry) =>
          entry.parentId === 'ENG-020' && entry.expectedComponentName === 'Motor de arranque',
      ),
    ).toBe(false);
  });

  it('HIER-001/HIER-011: registers a truck, its present engine and the engine baseline recursively', () => {
    const state = createInitialState();
    const result = registerAssembly(state, SELLER, {
      parent: {
        id: 'TRK-020',
        name: 'Camión recibido',
        categoryId: 'CAT-TRK',
        condition: 'USED',
        location: 'Patio D',
      },
      baseline: [
        {
          expectedComponentName: 'Motor',
          status: 'PRESENT',
          item: {
            id: 'ENG-020',
            name: 'Motor recibido dentro del camión',
            categoryId: 'CAT-ENG',
            condition: 'USED',
          },
          baseline: [
            {
              expectedComponentName: 'Alternador',
              status: 'PRESENT',
              item: {
                id: 'ALT-020',
                name: 'Alternador recibido dentro del motor',
                categoryId: 'CAT-ALT',
                condition: 'USED',
              },
            },
            { expectedComponentName: 'Turbo', status: 'MISSING' },
            { expectedComponentName: 'Motor de arranque', status: 'NOT_APPLICABLE' },
          ],
        },
        { expectedComponentName: 'Transmisión', status: 'NOT_APPLICABLE' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(state.items.find((item) => item.id === 'TRK-020')?.complete).toBe(true);
    expect(state.items.find((item) => item.id === 'ENG-020')).toMatchObject({
      parentId: 'TRK-020',
      complete: false,
    });
    expect(state.items.find((item) => item.id === 'ALT-020')).toMatchObject({
      parentId: 'ENG-020',
      physicalRelationship: 'INSTALLED',
    });
    expect(state.knownMissing).toContainEqual(
      expect.objectContaining({
        parentId: 'ENG-020',
        expectedComponentName: 'Turbo',
        origin: 'MISSING_AT_RECEIPT',
      }),
    );
    const detail = buildItemDetail(state, 'TRK-020');
    expect(detail?.tree.children[0]?.children[0]?.id).toBe('ALT-020');
    expect(detail?.tree.children[0]?.missingSlots.map((slot) => slot.name)).toEqual(['Turbo']);
    expect(state.events.at(-1)?.metadata?.receiptTree).toMatchObject({
      itemId: 'TRK-020',
      complete: true,
      baseline: [
        {
          expectedComponentName: 'Motor',
          status: 'PRESENT',
          child: {
            itemId: 'ENG-020',
            complete: false,
            baseline: [
              { expectedComponentName: 'Alternador', status: 'PRESENT' },
              { expectedComponentName: 'Turbo', status: 'MISSING' },
              { expectedComponentName: 'Motor de arranque', status: 'NOT_APPLICABLE' },
            ],
          },
        },
        { expectedComponentName: 'Transmisión', status: 'NOT_APPLICABLE' },
      ],
    });
  });

  it('rejects a deep child ID matching its parent case-insensitively without partial writes', () => {
    const state = createInitialState();
    const itemCount = state.items.length;
    const missingCount = state.knownMissing.length;
    const eventCount = state.events.length;
    const result = registerAssembly(state, SELLER, {
      parent: {
        id: 'TRK-020',
        name: 'Camión recibido',
        categoryId: 'CAT-TRK',
        condition: 'USED',
      },
      baseline: [
        {
          expectedComponentName: 'Motor',
          status: 'PRESENT',
          item: {
            id: 'ENG-020',
            name: 'Motor recibido',
            categoryId: 'CAT-ENG',
            condition: 'USED',
          },
          baseline: [
            {
              expectedComponentName: 'Alternador',
              status: 'PRESENT',
              item: {
                id: 'trk-020',
                name: 'ID repetido',
                categoryId: 'CAT-ALT',
                condition: 'USED',
              },
            },
            { expectedComponentName: 'Turbo', status: 'MISSING' },
            { expectedComponentName: 'Motor de arranque', status: 'NOT_APPLICABLE' },
          ],
        },
        { expectedComponentName: 'Transmisión', status: 'NOT_APPLICABLE' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(state.items).toHaveLength(itemCount);
    expect(state.knownMissing).toHaveLength(missingCount);
    expect(state.events).toHaveLength(eventCount);
  });

  it('rejects a child ID matching quantity inventory case-insensitively without partial writes', () => {
    const state = createInitialState();
    const itemCount = state.items.length;
    const result = registerAssembly(state, SELLER, {
      parent: {
        id: 'ENG-020',
        name: 'Motor recibido',
        categoryId: 'CAT-ENG',
        condition: 'USED',
      },
      baseline: [
        {
          expectedComponentName: 'Alternador',
          status: 'PRESENT',
          item: {
            id: 'qty-oil-15w40',
            name: 'Conflicto con cantidad',
            categoryId: 'CAT-ALT',
            condition: 'USED',
          },
        },
        { expectedComponentName: 'Turbo', status: 'MISSING' },
        { expectedComponentName: 'Motor de arranque', status: 'NOT_APPLICABLE' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(state.items).toHaveLength(itemCount);
    expect(state.items.some((item) => item.id === 'ENG-020')).toBe(false);
  });

  it('rejects quantity assemblies and missing or non-finite unit costs', () => {
    const state = createInitialState();
    const assembly = registerQtyProduct(state, SELLER, {
      id: 'QTY-ENGINE',
      name: 'Motor por cantidad',
      categoryId: 'CAT-ENG',
      initialQuantity: 1,
      unitCostDop: 1,
    });
    const missingCost = registerQtyProduct(state, SELLER, {
      id: 'QTY-NO-COST',
      name: 'Sin costo',
      categoryId: 'CAT-FIL',
      initialQuantity: 1,
    } as RegisterQtyProductInput);
    const nanCost = registerQtyProduct(state, SELLER, {
      id: 'QTY-NAN',
      name: 'Costo inválido',
      categoryId: 'CAT-FIL',
      initialQuantity: 1,
      unitCostDop: Number.NaN,
    });

    expect(assembly.ok).toBe(false);
    expect(missingCost.ok).toBe(false);
    expect(nanCost.ok).toBe(false);
    expect(
      state.qtyProducts.some((product) =>
        ['QTY-ENGINE', 'QTY-NO-COST', 'QTY-NAN'].includes(product.id),
      ),
    ).toBe(false);
  });

  it('rejects duplicate IDs and incomplete assembly checklists without partial writes', () => {
    const state = createInitialState();
    const itemCount = state.items.length;
    const missingCount = state.knownMissing.length;
    const duplicate = registerItem(state, SELLER, {
      id: 'FLT-001',
      name: 'Duplicado',
      categoryId: 'CAT-FIL',
      condition: 'USED',
    });
    const incomplete = registerAssembly(state, SELLER, {
      parent: {
        id: 'ENG-020',
        name: 'Motor incompleto',
        categoryId: 'CAT-ENG',
        condition: 'USED',
      },
      baseline: [{ expectedComponentName: 'Turbo', status: 'MISSING' }],
    });

    expect(duplicate.ok).toBe(false);
    expect(incomplete.ok).toBe(false);
    expect(state.items).toHaveLength(itemCount);
    expect(state.knownMissing).toHaveLength(missingCount);
  });

  it('leaves state unchanged when a protected descendant is rejected without an open draft', () => {
    const state = createInitialState();
    state.invoices = state.invoices.filter((invoice) => invoice.status !== 'DRAFT');
    const invoiceCount = state.invoices.length;
    const eventCount = state.events.length;

    const result = addInventoryToDraft(state, SELLER, { itemId: 'ALT-011' });

    expect(result.ok).toBe(false);
    expect(state.invoices).toHaveLength(invoiceCount);
    expect(state.invoices.some((invoice) => invoice.status === 'DRAFT')).toBe(false);
    expect(state.events).toHaveLength(eventCount);
  });

  it('does not create a draft when a quantity reservation is rejected', () => {
    const state = createInitialState();
    state.invoices = state.invoices.filter((invoice) => invoice.status !== 'DRAFT');
    const product = state.qtyProducts.find((entry) => entry.id === 'QTY-OIL-15W40')!;
    product.reserved = 0;
    const invoiceCount = state.invoices.length;

    const result = addInventoryToDraft(state, SELLER, {
      qtyProductId: 'QTY-OIL-15W40',
      quantity: 49,
    });

    expect(result.ok).toBe(false);
    expect(state.invoices).toHaveLength(invoiceCount);
    expect(state.invoices.some((invoice) => invoice.status === 'DRAFT')).toBe(false);
  });

  it('HIER-008: rejects adding a No desarmar descendant to a draft', () => {
    const state = createInitialState();
    const result = addInventoryToDraft(state, SELLER, { itemId: 'ALT-011' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('ENG-003');
    }
  });

  it('RES-001: reserves without marking the item Sold', () => {
    const state = createInitialState();
    const result = addInventoryToDraft(state, SELLER, { itemId: 'FLT-001' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.draftId).toBe('INV-DRAFT-01');
      expect(result.value.alreadyInDraft).toBe(false);
    }
    const filter = state.items.find((item) => item.id === 'FLT-001');
    expect(filter?.reservedByDraftId).toBe('INV-DRAFT-01');
    expect(filter?.commercialState).toBe('AVAILABLE');
  });

  it('RES-001: rejects overlapping parent reservation while a descendant is held', () => {
    const state = createInitialState();
    const result = addInventoryToDraft(state, SELLER, { itemId: 'ENG-001' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });

  it('RES-001: rejects adding a unique item already reserved on another draft', () => {
    const state = createInitialState();
    const filter = state.items.find((item) => item.id === 'FLT-001');
    expect(filter).toBeDefined();
    filter!.reservedByDraftId = 'INV-DRAFT-02';
    state.invoices.push({
      id: 'INV-DRAFT-02',
      status: 'DRAFT',
      customerId: 'C0',
      currency: 'DOP',
      fiscal: false,
      lines: [],
      payments: [],
      paymentState: 'UNPAID',
      createdAt: '2026-08-26T12:00:00.000Z',
    });

    const result = addInventoryToDraft(state, SELLER, { itemId: 'FLT-001' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
      expect(result.error.message).toContain('INV-DRAFT-02');
    }
    expect(
      state.invoices
        .find((invoice) => invoice.id === 'INV-DRAFT-01')
        ?.lines.some((line) => line.itemId === 'FLT-001'),
    ).toBe(false);
    expect(filter!.reservedByDraftId).toBe('INV-DRAFT-02');
  });

  it('HIER-008: rejects dismantling a No desarmar descendant', () => {
    const state = createInitialState();
    const result = createManualWorkOrder(state, SELLER, {
      pieceId: 'ALT-011',
      type: 'DISMANTLING',
    });
    expect(result.ok).toBe(false);
  });

  it('HIER-002: rejects installing a parent into its own descendant', () => {
    const state = createInitialState();
    const result = createManualWorkOrder(state, SELLER, {
      pieceId: 'TRK-001',
      type: 'INSTALLATION',
      destinationParentId: 'ENG-001',
    });
    expect(result.ok).toBe(false);
  });

  it('HIER-001: rejects installation into a unique part', () => {
    const state = createInitialState();
    const result = createManualWorkOrder(state, SELLER, {
      pieceId: 'ALT-010',
      type: 'INSTALLATION',
      destinationParentId: 'FLT-001',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a quantity greater than available-to-reserve', () => {
    const state = createInitialState();
    const result = addInventoryToDraft(state, SELLER, {
      qtyProductId: 'QTY-OIL-15W40',
      quantity: 47,
    });
    expect(result.ok).toBe(false);
  });

  it('reserves quantity as onHand minus previous reserved', () => {
    const state = createInitialState();
    const result = addInventoryToDraft(state, SELLER, {
      qtyProductId: 'QTY-FIL-AIR',
      quantity: 1,
    });
    expect(result.ok).toBe(true);
    const product = state.qtyProducts.find((entry) => entry.id === 'QTY-FIL-AIR');
    expect(product?.reserved).toBe(1);
    expect(availableToReserve(product!.onHand, product!.reserved)).toBe(23);
  });

  it('clears cost provenance explicitly and audits its before/after state', () => {
    const state = createInitialState();
    const item = state.items.find((entry) => entry.id === 'FLT-001')!;
    item.costProvenance = 'Factura de compra original';
    const beforeCost = item.acquisitionCostDop;

    const result = correctAcquisitionCost(state, SELLER, {
      itemId: item.id,
      acquisitionCostDop: 900,
      costProvenance: null,
      reason: 'Procedencia registrada por error',
    });

    expect(result.ok).toBe(true);
    expect(item.costProvenance).toBeUndefined();
    const event = state.events.find((entry) => entry.type === 'COST_CORRECTED');
    expect(event?.metadata).toMatchObject({
      itemId: item.id,
      before: beforeCost,
      after: 900,
      beforeCostProvenance: 'Factura de compra original',
    });
    expect(event?.metadata).toHaveProperty('afterCostProvenance', null);
  });

  it('rejects non-finite cost corrections without changing the item', () => {
    const state = createInitialState();
    const item = state.items.find((entry) => entry.id === 'FLT-001')!;
    const beforeCost = item.acquisitionCostDop;
    const eventCount = state.events.length;

    const result = correctAcquisitionCost(state, SELLER, {
      itemId: item.id,
      acquisitionCostDop: Number.NaN,
      reason: 'Valor inválido',
    });

    expect(result.ok).toBe(false);
    expect(item.acquisitionCostDop).toBe(beforeCost);
    expect(state.events).toHaveLength(eventCount);
  });
});
