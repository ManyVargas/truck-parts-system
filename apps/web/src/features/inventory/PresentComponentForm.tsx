import type { Category, ItemCondition } from '../../api/contracts/entities';
import type { RegisterItemInput } from '../../api/contracts/inventory';
import { Field, Input, Select } from '../../shared/ui';

type PresentComponentFormProps = {
  expectedName: string;
  category: Category | undefined;
  value: RegisterItemInput | undefined;
  onChange: (value: RegisterItemInput) => void;
  path: string;
};

const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: 'USED', label: 'Usado' },
  { value: 'NEW', label: 'Nuevo' },
  { value: 'REMANUFACTURED', label: 'Remanufacturado' },
];

export function PresentComponentForm({
  expectedName,
  category,
  value,
  onChange,
  path,
}: PresentComponentFormProps) {
  if (!category) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        No hay una categoría configurada para “{expectedName}”. Use Faltante o No aplica.
      </p>
    );
  }

  const current: RegisterItemInput = value ?? {
    id: '',
    name: expectedName,
    categoryId: category.id,
    condition: 'USED',
  };
  const patch = (next: Partial<RegisterItemInput>) => onChange({ ...current, ...next });
  const prefix = `component-${path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  return (
    <div className="grid gap-3 rounded-lg border border-navy-100 bg-navy-50 p-3 sm:grid-cols-2">
      <Field label="ID del componente" htmlFor={`${prefix}-id`}>
        <Input
          id={`${prefix}-id`}
          value={current.id}
          onChange={(event) => patch({ id: event.target.value })}
          placeholder="Ej. ALT-020"
        />
      </Field>
      <Field label="Nombre" htmlFor={`${prefix}-name`}>
        <Input
          id={`${prefix}-name`}
          value={current.name}
          onChange={(event) => patch({ name: event.target.value })}
        />
      </Field>
      <Field label="Condición" htmlFor={`${prefix}-condition`}>
        <Select
          id={`${prefix}-condition`}
          value={current.condition}
          onChange={(event) => patch({ condition: event.target.value as ItemCondition })}
        >
          {CONDITIONS.map((condition) => (
            <option key={condition.value} value={condition.value}>
              {condition.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Marca" htmlFor={`${prefix}-brand`}>
        <Input
          id={`${prefix}-brand`}
          value={current.brand ?? ''}
          onChange={(event) => patch({ brand: event.target.value })}
        />
      </Field>
      <Field label="Serial" htmlFor={`${prefix}-serial`}>
        <Input
          id={`${prefix}-serial`}
          value={current.serial ?? ''}
          onChange={(event) => patch({ serial: event.target.value })}
        />
      </Field>
      <Field label="Número de parte" htmlFor={`${prefix}-part`}>
        <Input
          id={`${prefix}-part`}
          value={current.partNumber ?? ''}
          onChange={(event) => patch({ partNumber: event.target.value })}
        />
      </Field>
      <Field label="Costo DOP (opcional)" htmlFor={`${prefix}-cost`}>
        <Input
          id={`${prefix}-cost`}
          type="number"
          min="0"
          step="0.01"
          value={current.acquisitionCostDop ?? ''}
          onChange={(event) =>
            patch({
              acquisitionCostDop:
                event.target.value === '' ? undefined : Number(event.target.value),
            })
          }
        />
      </Field>
    </div>
  );
}
