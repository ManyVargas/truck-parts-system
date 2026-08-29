import type { Category } from '../../api/contracts/entities';
import type { InventoryListFilters } from '../../api/contracts/inventory';
import { SearchInput, Select } from '../../shared/ui';

export type InventoryFiltersProps = {
  filters: InventoryListFilters;
  categories: Category[];
  onChange: (patch: Partial<InventoryListFilters>) => void;
};

export function InventoryFilters({ filters, categories, onChange }: InventoryFiltersProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end">
      <SearchInput
        id="inventory-search"
        className="max-w-md flex-1"
        label="Buscar inventario"
        placeholder="ID, nombre, marca, serial, número de parte…"
        value={filters.query ?? ''}
        onChange={(event) => onChange({ query: event.target.value })}
      />

      <div className="w-full max-w-xs">
        <label htmlFor="inventory-category" className="mb-1.5 block text-sm font-medium text-navy">
          Categoría
        </label>
        <Select
          id="inventory-category"
          value={filters.categoryId ?? ''}
          onChange={(event) => onChange({ categoryId: event.target.value || undefined })}
        >
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      <label className="flex items-center gap-2 pb-2 text-sm text-navy">
        <input
          type="checkbox"
          className="size-4 rounded border-navy-200"
          checked={filters.includeSold === true}
          onChange={(event) => onChange({ includeSold: event.target.checked })}
        />
        Mostrar vendidos
      </label>
    </div>
  );
}
