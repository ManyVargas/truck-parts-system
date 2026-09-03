import type { CommercialState, ItemCondition } from '../../api/contracts/entities';
import type {
  InventoryKind,
  InventoryListFilters,
  InventoryQuickFilter,
} from '../../api/contracts/inventory';

const QUICK_PARAMS: InventoryQuickFilter[] = [
  'available',
  'installed',
  'independent',
  'reserved',
  'assemblies',
  'incomplete',
  'quantity',
];

const CONDITIONS: ItemCondition[] = ['NEW', 'USED', 'REMANUFACTURED'];
const COMMERCIAL: Array<CommercialState | 'UNAVAILABLE'> = ['AVAILABLE', 'SOLD', 'UNAVAILABLE'];
const KINDS: InventoryKind[] = ['ITEM', 'QTY'];

function flag(params: URLSearchParams, key: InventoryQuickFilter): boolean {
  return params.get(key) === '1';
}

/**
 * Bidirectional inventory list query. Dashboard KPI links and the filter bar share these keys.
 */
export function inventoryFiltersFromSearch(search: string): InventoryListFilters {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const quick = QUICK_PARAMS.filter((key) => flag(params, key));
  const categoryId = params.get('category') || undefined;
  const location = params.get('location')?.trim() || undefined;
  const conditionRaw = params.get('condition');
  const commercialRaw = params.get('commercial');
  const kindRaw = params.get('kind');

  return {
    query: params.get('q') ?? '',
    categoryId,
    includeSold: params.get('sold') === '1',
    quick: quick.length > 0 ? quick : undefined,
    location,
    condition: CONDITIONS.includes(conditionRaw as ItemCondition)
      ? (conditionRaw as ItemCondition)
      : undefined,
    commercialState: COMMERCIAL.includes(commercialRaw as CommercialState | 'UNAVAILABLE')
      ? (commercialRaw as CommercialState | 'UNAVAILABLE')
      : undefined,
    kind: KINDS.includes(kindRaw as InventoryKind) ? (kindRaw as InventoryKind) : undefined,
    pendingCatalog: params.get('pendingCatalog') === '1',
  };
}

export function inventorySearchFromFilters(filters: InventoryListFilters): string {
  const params = new URLSearchParams();
  const query = filters.query?.trim();
  if (query) {
    params.set('q', query);
  }
  if (filters.categoryId) {
    params.set('category', filters.categoryId);
  }
  if (filters.includeSold) {
    params.set('sold', '1');
  }
  for (const key of filters.quick ?? []) {
    params.set(key, '1');
  }
  if (filters.location?.trim()) {
    params.set('location', filters.location.trim());
  }
  if (filters.condition) {
    params.set('condition', filters.condition);
  }
  if (filters.commercialState) {
    params.set('commercial', filters.commercialState);
  }
  if (filters.kind) {
    params.set('kind', filters.kind);
  }
  if (filters.pendingCatalog) {
    params.set('pendingCatalog', '1');
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}
