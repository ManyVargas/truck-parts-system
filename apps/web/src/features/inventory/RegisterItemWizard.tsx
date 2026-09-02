import { useMemo, useState, type FormEvent } from 'react';

import type { Category, ItemCondition } from '../../api/contracts/entities';
import type { AssemblyBaselineEntry, RegisterItemInput } from '../../api/contracts/inventory';
import { inventoryRepository } from '../../api/repositories';
import { useAppCapabilities } from '../../shared/config/CapabilitiesProvider';
import { Button, Field, Info, Input, Modal, Select, Textarea } from '../../shared/ui';
import { BaselineChecklist } from './BaselineChecklist';
import { PhotoEditor } from './PhotoEditor';

type RegistrationMode = 'INDIVIDUAL' | 'QUANTITY';

type RegisterItemWizardProps = {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onRegistered: (id: string) => void;
};

const EMPTY_ITEM: RegisterItemInput = {
  id: '',
  name: '',
  categoryId: '',
  condition: 'USED',
  photos: [],
};

const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: 'USED', label: 'Usado' },
  { value: 'NEW', label: 'Nuevo' },
  { value: 'REMANUFACTURED', label: 'Remanufacturado' },
];

function parseAttributes(value: string): Record<string, string> | undefined {
  const entries = value
    .split('\n')
    .map((line) => line.split(':', 2).map((part) => part.trim()))
    .filter(([key, entryValue]) => key && entryValue);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function RegisterItemWizard({
  open,
  categories,
  onClose,
  onRegistered,
}: RegisterItemWizardProps) {
  const { hierarchy } = useAppCapabilities();
  const [mode, setMode] = useState<RegistrationMode>('INDIVIDUAL');
  const [step, setStep] = useState<1 | 2>(1);
  const [item, setItem] = useState<RegisterItemInput>(EMPTY_ITEM);
  const [attributesText, setAttributesText] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('0');
  const [unitCostDop, setUnitCostDop] = useState('');
  const [baseline, setBaseline] = useState<AssemblyBaselineEntry[]>([]);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const visibleCategories = hierarchy
    ? categories
    : categories.filter((category) => !category.isAssembly);
  const selectedCategory = useMemo(
    () => visibleCategories.find((category) => category.id === item.categoryId),
    [visibleCategories, item.categoryId],
  );

  const patchItem = (patch: Partial<RegisterItemInput>) =>
    setItem((current) => ({ ...current, ...patch }));
  const reset = () => {
    setMode('INDIVIDUAL');
    setStep(1);
    setItem(EMPTY_ITEM);
    setAttributesText('');
    setInitialQuantity('0');
    setUnitCostDop('');
    setBaseline([]);
    setError(undefined);
    setSaving(false);
  };
  const close = () => {
    reset();
    onClose();
  };

  const save = async () => {
    setSaving(true);
    setError(undefined);
    const normalizedItem = { ...item, attributes: parseAttributes(attributesText) };
    const result =
      mode === 'QUANTITY'
        ? await inventoryRepository.registerQtyProduct({
            id: item.id,
            name: item.name,
            categoryId: item.categoryId,
            brand: item.brand,
            location: item.location,
            initialQuantity: Number(initialQuantity),
            unitCostDop: Number(unitCostDop),
          })
        : selectedCategory?.isAssembly
          ? await inventoryRepository.registerAssembly({ parent: normalizedItem, baseline })
          : await inventoryRepository.registerItem(normalizedItem);
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    const id = 'parent' in result.value ? result.value.parent.id : result.value.id;
    reset();
    onRegistered(id);
  };

  const handleFirstStep = (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (hierarchy && mode === 'INDIVIDUAL' && selectedCategory?.isAssembly) {
      const expected = selectedCategory.expectedComponents ?? [];
      setBaseline(
        expected.map((expectedComponentName) => ({
          expectedComponentName,
          status: 'MISSING',
        })),
      );
      setStep(2);
      return;
    }
    void save();
  };

  return (
    <Modal open={open} title="Registrar inventario" onClose={close}>
      <div className="max-h-[75vh] overflow-y-auto pr-1">
        {step === 1 ? (
          <form className="space-y-4" onSubmit={handleFirstStep}>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-navy">Modo de inventario</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="rounded-lg border border-navy-200 p-3 text-sm">
                  <input
                    type="radio"
                    name="registration-mode"
                    checked={mode === 'INDIVIDUAL'}
                    onChange={() => setMode('INDIVIDUAL')}
                  />{' '}
                  Individual
                </label>
                <label className="rounded-lg border border-navy-200 p-3 text-sm">
                  <input
                    type="radio"
                    name="registration-mode"
                    checked={mode === 'QUANTITY'}
                    onChange={() => setMode('QUANTITY')}
                  />{' '}
                  Por cantidad
                </label>
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ID interno" htmlFor="register-id">
                <Input
                  id="register-id"
                  value={item.id}
                  onChange={(event) => patchItem({ id: event.target.value })}
                  required
                />
              </Field>
              <Field label="Nombre" htmlFor="register-name">
                <Input
                  id="register-name"
                  value={item.name}
                  onChange={(event) => patchItem({ name: event.target.value })}
                  required
                />
              </Field>
              <Field label="Categoría" htmlFor="register-category">
                <Select
                  id="register-category"
                  value={item.categoryId}
                  onChange={(event) => patchItem({ categoryId: event.target.value })}
                  required
                >
                  <option value="">Seleccione…</option>
                  {visibleCategories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                      disabled={mode === 'QUANTITY' && category.isAssembly}
                    >
                      {category.name}
                      {category.isAssembly ? ' · Ensamblaje' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Marca" htmlFor="register-brand">
                <Input
                  id="register-brand"
                  value={item.brand ?? ''}
                  onChange={(event) => patchItem({ brand: event.target.value })}
                />
              </Field>
              {mode === 'INDIVIDUAL' && (
                <>
                  <Field label="Modelo" htmlFor="register-model">
                    <Input
                      id="register-model"
                      value={item.model ?? ''}
                      onChange={(event) => patchItem({ model: event.target.value })}
                    />
                  </Field>
                  <Field label="Serial" htmlFor="register-serial">
                    <Input
                      id="register-serial"
                      value={item.serial ?? ''}
                      onChange={(event) => patchItem({ serial: event.target.value })}
                    />
                  </Field>
                  <Field label="Número de parte" htmlFor="register-part">
                    <Input
                      id="register-part"
                      value={item.partNumber ?? ''}
                      onChange={(event) => patchItem({ partNumber: event.target.value })}
                    />
                  </Field>
                  <Field label="Condición" htmlFor="register-condition">
                    <Select
                      id="register-condition"
                      value={item.condition}
                      onChange={(event) =>
                        patchItem({ condition: event.target.value as ItemCondition })
                      }
                    >
                      {CONDITIONS.map((condition) => (
                        <option key={condition.value} value={condition.value}>
                          {condition.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Costo en pesos (opcional)"
                    htmlFor="register-cost"
                    hint="Déjelo vacío si se desconoce."
                  >
                    <Input
                      id="register-cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.acquisitionCostDop ?? ''}
                      onChange={(event) =>
                        patchItem({
                          acquisitionCostDop:
                            event.target.value === '' ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Procedencia del costo" htmlFor="register-cost-source">
                    <Input
                      id="register-cost-source"
                      value={item.costProvenance ?? ''}
                      onChange={(event) => patchItem({ costProvenance: event.target.value })}
                    />
                  </Field>
                </>
              )}
              {mode === 'QUANTITY' && (
                <>
                  <Field label="Existencia inicial" htmlFor="register-quantity">
                    <Input
                      id="register-quantity"
                      type="number"
                      min="0"
                      step="1"
                      value={initialQuantity}
                      onChange={(event) => setInitialQuantity(event.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Costo unitario en pesos" htmlFor="register-unit-cost">
                    <Input
                      id="register-unit-cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitCostDop}
                      onChange={(event) => setUnitCostDop(event.target.value)}
                      required
                    />
                  </Field>
                </>
              )}
              <Field label="Ubicación" htmlFor="register-location">
                <Input
                  id="register-location"
                  value={item.location ?? ''}
                  onChange={(event) => patchItem({ location: event.target.value })}
                />
              </Field>
            </div>

            {mode === 'INDIVIDUAL' && (
              <>
                <Field
                  label="Atributos"
                  htmlFor="register-attributes"
                  hint="Uno por línea con formato nombre: valor."
                >
                  <Textarea
                    id="register-attributes"
                    rows={3}
                    value={attributesText}
                    onChange={(event) => setAttributesText(event.target.value)}
                    placeholder="voltaje: 24V"
                  />
                </Field>
                <Field label="Notas" htmlFor="register-notes">
                  <Textarea
                    id="register-notes"
                    rows={3}
                    value={item.notes ?? ''}
                    onChange={(event) => patchItem({ notes: event.target.value })}
                  />
                </Field>
                <PhotoEditor
                  photos={item.photos ?? []}
                  onChange={(photos) => patchItem({ photos })}
                />
              </>
            )}

            {error && <Info tone="error">{error}</Info>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {hierarchy && selectedCategory?.isAssembly && mode === 'INDIVIDUAL'
                  ? 'Continuar'
                  : saving
                    ? 'Guardando…'
                    : 'Registrar'}
              </Button>
            </div>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <BaselineChecklist
              expectedComponents={selectedCategory?.expectedComponents ?? []}
              categories={categories}
              entries={baseline}
              onChange={setBaseline}
            />
            {error && <Info tone="error">{error}</Info>}
            <div className="flex justify-between gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Registrar ensamblaje'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
