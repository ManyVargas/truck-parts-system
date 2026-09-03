import type { Category } from '../../api/contracts/entities';
import type {
  AssemblyBaselineEntry,
  BaselineStatus,
  RegisterItemInput,
} from '../../api/contracts/inventory';
import { PresentComponentForm } from './PresentComponentForm';

type BaselineChecklistProps = {
  expectedComponents: string[];
  categories: Category[];
  entries: AssemblyBaselineEntry[];
  onChange: (entries: AssemblyBaselineEntry[]) => void;
  path?: string;
};

const STATUS_OPTIONS: { value: BaselineStatus; label: string }[] = [
  { value: 'PRESENT', label: 'Presente' },
  { value: 'MISSING', label: 'Faltante' },
  { value: 'NOT_APPLICABLE', label: 'No aplica' },
];

export function BaselineChecklist({
  expectedComponents,
  categories,
  entries,
  onChange,
  path = 'root',
}: BaselineChecklistProps) {
  const update = (expectedComponentName: string, patch: Partial<AssemblyBaselineEntry>) => {
    onChange(
      entries.map((entry) =>
        entry.expectedComponentName === expectedComponentName ? { ...entry, ...patch } : entry,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-navy">Baseline de recepción</h3>
        <p className="text-sm text-navy-400">
          Confirme el estado de cada componente esperado. Todos son obligatorios.
        </p>
      </div>
      {expectedComponents.map((expectedName) => {
        const entry = entries.find(
          (candidate) => candidate.expectedComponentName === expectedName,
        )!;
        const category = categories.find((candidate) => candidate.name === expectedName);
        const entryPath = `${path}.${expectedName}`;
        return (
          <fieldset key={expectedName} className="space-y-3 rounded-lg border border-navy-200 p-4">
            <legend className="px-1 font-medium text-navy">{expectedName}</legend>
            <div className="flex flex-wrap gap-4">
              {STATUS_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm text-navy">
                  <input
                    type="radio"
                    name={`baseline-${entryPath}`}
                    value={option.value}
                    checked={entry.status === option.value}
                    onChange={() =>
                      update(expectedName, {
                        status: option.value,
                        item:
                          option.value === 'PRESENT'
                            ? (entry.item ??
                              (category
                                ? {
                                    name: expectedName,
                                    categoryId: category.id,
                                    condition: 'USED',
                                  }
                                : undefined))
                            : undefined,
                        baseline:
                          option.value === 'PRESENT' && category?.isAssembly
                            ? (entry.baseline ??
                              (category.expectedComponents ?? []).map(
                                (nestedExpectedComponentName) => ({
                                  expectedComponentName: nestedExpectedComponentName,
                                  status: 'MISSING' as const,
                                }),
                              ))
                            : undefined,
                      })
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {entry.status === 'PRESENT' && (
              <PresentComponentForm
                expectedName={expectedName}
                category={category}
                value={entry.item}
                onChange={(item: RegisterItemInput) => update(expectedName, { item })}
                path={entryPath}
              />
            )}
            {entry.status === 'PRESENT' && category?.isAssembly && (
              <div className="ml-2 border-l-2 border-brand-light/30 pl-4">
                <BaselineChecklist
                  expectedComponents={category.expectedComponents ?? []}
                  categories={categories}
                  entries={entry.baseline ?? []}
                  onChange={(baseline) => update(expectedName, { baseline })}
                  path={entryPath}
                />
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
