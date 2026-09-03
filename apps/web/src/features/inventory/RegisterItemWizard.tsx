import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Category, ItemCondition } from '../../api/contracts/entities';
import type { AssemblyBaselineEntry, RegisterItemInput } from '../../api/contracts/inventory';
import { inventoryRepository } from '../../api/repositories';
import { useAppCapabilities } from '../../shared/config/CapabilitiesProvider';
import { Button, Field, Info, Input, Modal, Select, Textarea } from '../../shared/ui';
import { BaselineChecklist } from './BaselineChecklist';
import { ITEM_CONDITIONS } from './item-conditions';
import { OptionalDetails } from './OptionalDetails';
import { PhotoEditor } from './PhotoEditor';
import {
  mergeBaselineEntries,
  parseAttributeLines,
  pendingEnrichmentLabels,
  type RegistrationMode,
} from './registration-enrichment';

type RegisterItemWizardProps = {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onRegistered: (id: string) => void;
};

const EMPTY_ITEM: RegisterItemInput = {
  name: '',
  categoryId: '',
  condition: 'USED',
  photos: [],
};

type RegisteredSummary = {
  id: string;
  pending: string[];
};

export function RegisterItemWizard({
  open,
  categories,
  onClose,
  onRegistered,
}: RegisterItemWizardProps) {
  const navigate = useNavigate();
  const { hierarchy } = useAppCapabilities();
  const [mode, setMode] = useState<RegistrationMode>('INDIVIDUAL');
  const [step, setStep] = useState<1 | 2>(1);
  const [item, setItem] = useState<RegisterItemInput>(EMPTY_ITEM);
  const [qtySku, setQtySku] = useState('');
  const [attributesText, setAttributesText] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('0');
  const [unitCostDop, setUnitCostDop] = useState('');
  const [baseline, setBaseline] = useState<AssemblyBaselineEntry[]>([]);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [registered, setRegistered] = useState<RegisteredSummary>();

  const visibleCategories = hierarchy
    ? categories
    : categories.filter((category) => !category.isAssembly);
  const selectedCategory = useMemo(
    () => visibleCategories.find((category) => category.id === item.categoryId),
    [visibleCategories, item.categoryId],
  );
  const isAssemblyFlow =
    Boolean(hierarchy) && mode === 'INDIVIDUAL' && Boolean(selectedCategory?.isAssembly);

  const patchItem = (patch: Partial<RegisterItemInput>) =>
    setItem((current) => ({ ...current, ...patch }));
  const reset = () => {
    setMode('INDIVIDUAL');
    setStep(1);
    setItem(EMPTY_ITEM);
    setQtySku('');
    setAttributesText('');
    setInitialQuantity('0');
    setUnitCostDop('');
    setBaseline([]);
    setError(undefined);
    setSaving(false);
    setRegistered(undefined);
  };
  const close = () => {
    reset();
    onClose();
  };

  const save = async () => {
    setSaving(true);
    setError(undefined);
    const attributes = parseAttributeLines(attributesText);
    const normalizedItem = { ...item, attributes };
    const result =
      mode === 'QUANTITY'
        ? await inventoryRepository.registerQtyProduct({
            id: qtySku,
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
    onRegistered(id);
    setRegistered({
      id,
      pending: pendingEnrichmentLabels(mode, normalizedItem),
    });
  };

  const handleFirstStep = (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (isAssemblyFlow) {
      setBaseline(
        mergeBaselineEntries(selectedCategory?.expectedComponents ?? [], baseline),
      );
      setStep(2);
      return;
    }
    void save();
  };

  const modalTitle = registered
    ? 'Inventario registrado'
    : isAssemblyFlow && step === 2
      ? 'Registrar ensamblaje'
      : 'Registrar inventario';

  return (
    <Modal open={open} title={modalTitle} onClose={close}>
      <div className="max-h-[75vh] overflow-y-auto pr-1">
        {registered ? (
          <div className="space-y-4">
            <Info tone="success" title={`${registered.id} quedó registrado`}>
              <p>Ya está en inventario y puede buscarse en el listado.</p>
              {registered.pending.length > 0 ? (
                <>
                  <p className="mt-2">
                    Aún puede completar: {registered.pending.join(', ')}.
                  </p>
                  <p className="mt-1">Esa información se añade después desde el detalle de la pieza.</p>
                </>
              ) : (
                <p className="mt-2">No quedó información adicional pendiente.</p>
              )}
            </Info>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                Volver al listado
              </Button>
              <Button
                onClick={() => {
                  const itemId = registered.id;
                  close();
                  navigate(`/inventory/${itemId}`);
                }}
              >
                Ver pieza
              </Button>
            </div>
          </div>
        ) : step === 1 ? (
          <form className="space-y-4" onSubmit={handleFirstStep}>
            {isAssemblyFlow && (
              <p className="text-sm font-medium text-navy" aria-live="polite">
                Paso 1 de 2 — Información del ensamblaje
              </p>
            )}

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-navy">Tipo de registro</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="rounded-lg border border-navy-200 p-3 text-sm">
                  <input
                    type="radio"
                    name="registration-mode"
                    checked={mode === 'INDIVIDUAL'}
                    onChange={() => setMode('INDIVIDUAL')}
                  />{' '}
                  Pieza individual
                </label>
                <label className="rounded-lg border border-navy-200 p-3 text-sm">
                  <input
                    type="radio"
                    name="registration-mode"
                    checked={mode === 'QUANTITY'}
                    onChange={() => setMode('QUANTITY')}
                  />{' '}
                  Producto por cantidad
                </label>
              </div>
            </fieldset>

            {error && (
              <Info tone="error" title="No se pudo registrar">
                {error}
              </Info>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {mode === 'QUANTITY' ? (
                <Field
                  label="Código de producto"
                  htmlFor="register-id"
                  hint="SKU del producto intercambiable, no un código por unidad."
                >
                  <Input
                    id="register-id"
                    value={qtySku}
                    onChange={(event) => setQtySku(event.target.value)}
                    required
                  />
                </Field>
              ) : (
                <Field
                  label="Código interno"
                  htmlFor="register-code"
                  hint={
                    selectedCategory
                      ? `Se asignará al guardar con prefijo ${selectedCategory.codePrefix}.`
                      : 'Elige una categoría; el sistema asigna el código.'
                  }
                >
                  <Input
                    id="register-code"
                    value={
                      selectedCategory
                        ? selectedCategory.codePrefix
                        : 'Seleccione una categoría'
                    }
                    readOnly
                    disabled
                  />
                </Field>
              )}
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
              {mode === 'INDIVIDUAL' && (
                <>
                  <Field label="Condición" htmlFor="register-condition">
                    <Select
                      id="register-condition"
                      value={item.condition}
                      onChange={(event) =>
                        patchItem({ condition: event.target.value as ItemCondition })
                      }
                    >
                      {ITEM_CONDITIONS.map((condition) => (
                        <option key={condition.value} value={condition.value}>
                          {condition.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Costo en pesos (opcional)"
                    htmlFor="register-cost"
                    hint="Déjelo vacío si todavía no se conoce. Vacío no es cero."
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
                </>
              )}
              {mode === 'QUANTITY' && (
                <>
                  <Field
                    label="Existencia inicial"
                    htmlFor="register-quantity"
                    hint="Cantidad que entra ahora. Recibos posteriores se registran después."
                  >
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
                  <Field
                    label="Costo unitario en pesos"
                    htmlFor="register-unit-cost"
                    hint="Costo en DOP de esta entrada."
                  >
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
            </div>

            <OptionalDetails>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Marca (opcional)" htmlFor="register-brand">
                  <Input
                    id="register-brand"
                    value={item.brand ?? ''}
                    onChange={(event) => patchItem({ brand: event.target.value })}
                  />
                </Field>
                {mode === 'INDIVIDUAL' && (
                  <>
                    <Field label="Modelo (opcional)" htmlFor="register-model">
                      <Input
                        id="register-model"
                        value={item.model ?? ''}
                        onChange={(event) => patchItem({ model: event.target.value })}
                      />
                    </Field>
                    <Field label="Serial (opcional)" htmlFor="register-serial">
                      <Input
                        id="register-serial"
                        value={item.serial ?? ''}
                        onChange={(event) => patchItem({ serial: event.target.value })}
                      />
                    </Field>
                    <Field label="Número de parte (opcional)" htmlFor="register-part">
                      <Input
                        id="register-part"
                        value={item.partNumber ?? ''}
                        onChange={(event) => patchItem({ partNumber: event.target.value })}
                      />
                    </Field>
                    <Field
                      label="Procedencia del costo (opcional)"
                      htmlFor="register-cost-source"
                      hint="Por ejemplo: factura, estimado."
                    >
                      <Input
                        id="register-cost-source"
                        value={item.costProvenance ?? ''}
                        onChange={(event) => patchItem({ costProvenance: event.target.value })}
                      />
                    </Field>
                  </>
                )}
                <Field label="Ubicación (opcional)" htmlFor="register-location">
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
                    label="Atributos (opcional)"
                    htmlFor="register-attributes"
                    hint="Uno por línea, por ejemplo voltaje: 24V."
                  >
                    <Textarea
                      id="register-attributes"
                      rows={3}
                      value={attributesText}
                      onChange={(event) => setAttributesText(event.target.value)}
                    />
                  </Field>
                  <Field label="Notas (opcional)" htmlFor="register-notes">
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
            </OptionalDetails>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {isAssemblyFlow
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
            <p className="text-sm font-medium text-navy" aria-live="polite">
              Paso 2 de 2 — Componentes iniciales
            </p>
            {error && (
              <Info tone="error" title="No se pudo registrar">
                {error}
              </Info>
            )}
            <BaselineChecklist
              expectedComponents={selectedCategory?.expectedComponents ?? []}
              categories={categories}
              entries={baseline}
              onChange={setBaseline}
            />
            <div className="flex justify-between gap-2">
              <Button variant="secondary" onClick={() => setStep(1)} disabled={saving}>
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
