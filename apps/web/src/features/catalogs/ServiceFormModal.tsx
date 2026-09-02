import { useEffect, useState, type FormEvent } from 'react';

import type { SaveServiceInput } from '../../api/contracts/catalogs';
import type { Service } from '../../api/contracts/entities';
import { Button, Field, Info, Input, Modal } from '../../shared/ui';

export type ServiceFormModalProps = {
  open: boolean;
  service: Service | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: SaveServiceInput) => void;
};

type FormFields = {
  name: string;
  active: boolean;
};

const EMPTY_FIELDS: FormFields = {
  name: '',
  active: true,
};

export function ServiceFormModal({
  open,
  service,
  isSaving,
  error,
  onClose,
  onSubmit,
}: ServiceFormModalProps) {
  const [fields, setFields] = useState<FormFields>(EMPTY_FIELDS);
  const isEdit = service != null;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!service) {
      setFields(EMPTY_FIELDS);
      return;
    }

    setFields({
      name: service.name,
      active: service.active,
    });
  }, [open, service]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      id: service?.id,
      name: fields.name,
      active: fields.active,
    });
  }

  return (
    <Modal open={open} title={isEdit ? 'Editar servicio' : 'Nuevo servicio'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre" htmlFor="service-name">
          <Input
            id="service-name"
            value={fields.name}
            onChange={(event) => setFields((current) => ({ ...current, name: event.target.value }))}
            required
            autoFocus
          />
        </Field>

        <label htmlFor="service-active" className="flex items-center gap-2 text-sm text-navy">
          <input
            id="service-active"
            type="checkbox"
            checked={fields.active}
            onChange={(event) =>
              setFields((current) => ({ ...current, active: event.target.checked }))
            }
          />
          Activo (visible en el punto de venta)
        </label>

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
