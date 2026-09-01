import { describe, expect, it } from 'vitest';

import { createInitialState } from '../../../../src/mocks/data/seed';
import {
  nextCategoryId,
  nextServiceId,
  prepareCategorySave,
  prepareServiceSave,
} from '../../../../src/mocks/services/catalogs';
import {
  addedExpectedComponentNames,
  backfillPendingExpectedComponents,
} from '../../../../src/mocks/services/catalogs-reviews';
import { isComplete } from '../../../../src/mocks/services/inventory-helpers';

describe('prepareCategorySave', () => {
  const seedCategories = createInitialState().categories;

  it('creates a unique assembly category without touching inventory', () => {
    expect(nextCategoryId(seedCategories, 'Rin')).toBe('CAT-RIN');

    const result = prepareCategorySave(seedCategories, {
      name: '  Rin  ',
      isAssembly: true,
      expectedComponents: ['Disco', '  Tuerca  ', ''],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        id: 'CAT-RIN',
        name: 'Rin',
        isAssembly: true,
        expectedComponents: ['Disco', 'Tuerca'],
      });
    }
    expect(createInitialState().items).toHaveLength(createInitialState().items.length);
  });

  it('rejects a duplicate expected-component name on save', () => {
    const result = prepareCategorySave(seedCategories, {
      id: 'CAT-ENG',
      name: 'Motor',
      isAssembly: true,
      expectedComponents: ['Alternador', 'Turbo', 'Motor de arranque', 'alternador'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.message).toContain('alternador');
    }
  });

  it('preserves canonical component spelling for a case-only edit', () => {
    const result = prepareCategorySave(seedCategories, {
      id: 'CAT-ENG',
      name: 'Motor',
      isAssembly: true,
      expectedComponents: ['Alternador', 'turbo', 'Motor de arranque'],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.expectedComponents).toEqual([
        'Alternador',
        'Turbo',
        'Motor de arranque',
      ]);
    }
  });

  it('rejects an assembly without expected components', () => {
    const result = prepareCategorySave(seedCategories, {
      name: 'Caja',
      isAssembly: true,
      expectedComponents: ['  '],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('edits a seed category without rewriting its id', () => {
    const result = prepareCategorySave(seedCategories, {
      id: 'CAT-FIL',
      name: 'Filtros HD',
      isAssembly: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('CAT-FIL');
      expect(result.value.name).toBe('Filtros HD');
      expect(result.value.expectedComponents).toBeUndefined();
    }
  });

  it('returns NOT_FOUND for an unknown category id', () => {
    const result = prepareCategorySave(seedCategories, {
      id: 'CAT-MISSING',
      name: 'Fantasma',
      isAssembly: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});

describe('prepareServiceSave', () => {
  const seedServices = createInitialState().services;

  it('creates the next service id from the name', () => {
    expect(nextServiceId(seedServices, 'Alineación')).toBe('SVC-ALINEACI');

    const result = prepareServiceSave(seedServices, {
      name: 'Alineación',
      active: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        id: 'SVC-ALINEACI',
        name: 'Alineación',
        active: true,
      });
    }
  });

  it('rejects a duplicate service name', () => {
    const result = prepareServiceSave(seedServices, {
      name: 'instalación mecánica',
      active: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });

  it('can deactivate an existing service', () => {
    const result = prepareServiceSave(seedServices, {
      id: 'SVC-INST',
      name: 'Instalación mecánica',
      active: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.active).toBe(false);
    }
  });
});

describe('catalog expected-component backfill', () => {
  const admin = createInitialState().users[0]!;

  it('detects only newly added expected names', () => {
    expect(
      addedExpectedComponentNames(
        ['Alternador', 'Turbo', 'Motor de arranque'],
        ['Alternador', 'Turbo', 'Motor de arranque', 'Bomba de aceite'],
      ),
    ).toEqual(['Bomba de aceite']);
    expect(addedExpectedComponentNames(['Turbo'], ['turbo'])).toEqual([]);
  });

  it('adds provisional NA to unsold assemblies without changing completeness', () => {
    const state = createInitialState();
    const engine = state.categories.find((category) => category.id === 'CAT-ENG')!;
    const created = backfillPendingExpectedComponents(state, admin, engine, ['Bomba de aceite']);

    expect(created.map((entry) => entry.parentId).sort()).toEqual(['ENG-001', 'ENG-002', 'ENG-003']);
    expect(
      isComplete(state.items.find((item) => item.id === 'ENG-001')!, state.knownMissing, state.categories),
    ).toBe(true);
    expect(
      isComplete(state.items.find((item) => item.id === 'ENG-002')!, state.knownMissing, state.categories),
    ).toBe(false);
    expect(
      state.knownMissing.some((entry) => entry.expectedComponentName === 'Bomba de aceite'),
    ).toBe(false);
    expect(state.events.some((event) => event.type === 'CATALOG_EXPECTED_ADDED')).toBe(true);
  });

  it('skips sold assemblies and slots already present or missing', () => {
    const state = createInitialState();
    const sold = state.items.find((item) => item.id === 'ENG-003')!;
    sold.commercialState = 'SOLD';
    const engine = state.categories.find((category) => category.id === 'CAT-ENG')!;

    const created = backfillPendingExpectedComponents(state, admin, engine, [
      'Bomba de aceite',
      'Alternador',
    ]);

    expect(created.every((entry) => entry.parentId !== 'ENG-003')).toBe(true);
    expect(
      created
        .filter((entry) => entry.expectedComponentName === 'Bomba de aceite')
        .map((entry) => entry.parentId)
        .sort(),
    ).toEqual(['ENG-001', 'ENG-002']);
    expect(
      created.find(
        (entry) => entry.parentId === 'ENG-001' && entry.expectedComponentName === 'Alternador',
      ),
    ).toMatchObject({ kind: 'ALREADY_PRESENT', matchedChildId: 'ALT-004' });
    expect(
      created.some(
        (entry) => entry.parentId === 'ENG-002' && entry.expectedComponentName === 'Alternador',
      ),
    ).toBe(false);
  });

  it('records an already-installed matching child as present in the tree', () => {
    const state = createInitialState();
    const admin = state.users[0]!;
    const engine = state.categories.find((category) => category.id === 'CAT-ENG')!;
    const created = backfillPendingExpectedComponents(state, admin, engine, ['Alternador']);

    expect(created.find((entry) => entry.parentId === 'ENG-001')).toMatchObject({
      kind: 'ALREADY_PRESENT',
      matchedChildId: 'ALT-004',
    });
    expect(state.items.find((item) => item.id === 'ALT-004')?.parentId).toBe('ENG-001');
    expect(state.events.some((event) => event.type === 'CATALOG_EXPECTED_MATCHED')).toBe(true);
  });
});
