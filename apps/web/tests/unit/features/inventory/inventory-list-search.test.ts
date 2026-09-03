import { describe, expect, it } from 'vitest';

import {
  inventoryFiltersFromSearch,
  inventorySearchFromFilters,
} from '../../../../src/features/inventory/inventory-list-search';

describe('inventoryFiltersFromSearch', () => {
  it('reads dashboard available=1 as the Disponible quick filter', () => {
    expect(inventoryFiltersFromSearch('?available=1')).toMatchObject({
      query: '',
      includeSold: false,
      quick: ['available'],
      pendingCatalog: false,
    });
  });

  it('reads every documented key', () => {
    const filters = inventoryFiltersFromSearch(
      '?q=alt&category=CAT-ALT&sold=1&available=1&installed=1&independent=1&reserved=1&assemblies=1&incomplete=1&quantity=1&location=Patio&condition=USED&commercial=AVAILABLE&kind=ITEM&pendingCatalog=1',
    );

    expect(filters).toEqual({
      query: 'alt',
      categoryId: 'CAT-ALT',
      includeSold: true,
      quick: [
        'available',
        'installed',
        'independent',
        'reserved',
        'assemblies',
        'incomplete',
        'quantity',
      ],
      location: 'Patio',
      condition: 'USED',
      commercialState: 'AVAILABLE',
      kind: 'ITEM',
      pendingCatalog: true,
    });
  });

  it('ignores unknown condition, commercial and kind values', () => {
    expect(
      inventoryFiltersFromSearch('?condition=OLD&commercial=LEASED&kind=BUNDLE'),
    ).toMatchObject({
      condition: undefined,
      commercialState: undefined,
      kind: undefined,
    });
  });
});

describe('inventorySearchFromFilters', () => {
  it('writes canonical keys and omits empty values', () => {
    expect(inventorySearchFromFilters({ quick: ['available'] })).toBe('?available=1');
    expect(inventorySearchFromFilters({ query: '', includeSold: false })).toBe('');
    expect(
      inventorySearchFromFilters({
        query: 'turbo',
        includeSold: true,
        pendingCatalog: true,
        kind: 'QTY',
        commercialState: 'UNAVAILABLE',
      }),
    ).toBe('?q=turbo&sold=1&commercial=UNAVAILABLE&kind=QTY&pendingCatalog=1');
  });
});

describe('inventory list search round-trip', () => {
  it('keeps operational filters stable through parse and serialize', () => {
    const search =
      '?q=alt&category=CAT-ALT&sold=1&available=1&independent=1&location=almac%C3%A9n&condition=NEW&commercial=SOLD&kind=QTY&pendingCatalog=1';
    const filters = inventoryFiltersFromSearch(search);
    expect(inventoryFiltersFromSearch(inventorySearchFromFilters(filters))).toEqual(filters);
  });
});
