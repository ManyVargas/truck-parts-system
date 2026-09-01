import { useEffect, useState, type FormEvent } from 'react';

import type { SaveCategoryInput } from '../../api/contracts/catalogs';
import type { Category } from '../../api/contracts/entities';
import { Button, Field, Info, Input, Modal, Textarea } from '../../shared/ui';

export type CategoryFormModalProps = {
  open: boolean;
  category: Category | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: SaveCategoryInput) => void;
};

type FormFields = {
  name: string;
  isAssembly: boolean;
  expectedComponentsText: string;
};

const EMPTY_FIELDS: FormFields = {
  name: '',
  isAssembly: false,
  expectedComponentsText: '',
};

export function CategoryFormModal({
  open,
  category,
  isSaving,
  error,
  onClose,
  onSubmit,
}: CategoryFormModalProps) {
  const [fields, setFields] = useState<FormFields>(EMPTY_FIELDS);
  const isEdit = category != null;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!category) {
      setFields(EMPTY_FIELDS);
      return;
    }

    setFields({
      name: category.name,
      isAssembly: category.isAssembly,
      expectedComponentsText: (category.expectedComponents ?? []).join('\n'),
    });
  }, [open, category]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      id: category?.id,
      name: fields.name,
      isAssembly: fields.isAssembly,
      expectedComponents: fields.isAssembly
        ? fields.expectedComponentsText.split('\n')
        : undefined,
    });
  }

  return (
    <Modal open={open} title={isEdit ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre" htmlFor="category-name">
          <Input
            id="category-name"
            value={fields.name}
            onChange={(event) => setFields((current) => ({ ...current, name: event.target.value }))}
            required
            autoFocus
          />
        </Field>

        <label htmlFor="category-assembly" className="flex items-center gap-2 text-sm text-navy">
          <input
            id="category-assembly"
            type="checkbox"
            checked={fields.isAssembly}
            onChange={(event) =>
              setFields((current) => ({ ...current, isAssembly: event.target.checked }))
            }
          />
          Es ensamblaje (requiere componentes esperados)
        </label>

        {fields.isAssembly && (
          <Field
            label="Componentes esperados"
            htmlFor="category-expected"
            hint="Un nombre por línea. Son plantillas de checklist, no inventario."
          >
            <Textarea
              id="category-expected"
              rows={5}
              value={fields.expectedComponentsText}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  expectedComponentsText: event.target.value,
                }))
              }
            />
          </Field>
        )}

        {error && (
          <Info tone="error" title="No se pudo guardar">
            {error}
          </Info>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
