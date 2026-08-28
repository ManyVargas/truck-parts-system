import { useEffect, useState, type FormEvent } from 'react';

import type { Customer } from '../../api/contracts/entities';
import type { SaveCustomerInput } from '../../api/contracts/customers';
import { Button, Field, Info, Input, Modal, Textarea } from '../../shared/ui';

export type CustomerFormModalProps = {
  open: boolean;
  customer: Customer | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: SaveCustomerInput) => void;
};

type FormFields = {
  name: string;
  rnc: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

const EMPTY_FIELDS: FormFields = {
  name: '',
  rnc: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

function fieldsFromCustomer(customer: Customer | null): FormFields {
  if (!customer) {
    return EMPTY_FIELDS;
  }

  return {
    name: customer.name,
    rnc: customer.rnc ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
    notes: customer.notes ?? '',
  };
}

export function CustomerFormModal({
  open,
  customer,
  isSaving,
  error,
  onClose,
  onSubmit,
}: CustomerFormModalProps) {
  const [fields, setFields] = useState<FormFields>(EMPTY_FIELDS);
  const isEdit = customer != null;

  useEffect(() => {
    if (open) {
      setFields(fieldsFromCustomer(customer));
    }
  }, [open, customer]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      id: customer?.id,
      name: fields.name,
      rnc: fields.rnc,
      phone: fields.phone,
      email: fields.email,
      address: fields.address,
      notes: fields.notes,
    });
  }

  return (
    <Modal open={open} title={isEdit ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre" htmlFor="customer-name">
          <Input
            id="customer-name"
            value={fields.name}
            onChange={(event) => setFields((current) => ({ ...current, name: event.target.value }))}
            required
            autoFocus
          />
        </Field>
        <Field label="RNC / Cédula" htmlFor="customer-rnc" hint="Opcional en ventas no fiscales">
          <Input
            id="customer-rnc"
            value={fields.rnc}
            onChange={(event) => setFields((current) => ({ ...current, rnc: event.target.value }))}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono" htmlFor="customer-phone">
            <Input
              id="customer-phone"
              value={fields.phone}
              onChange={(event) => setFields((current) => ({ ...current, phone: event.target.value }))}
            />
          </Field>
          <Field label="Correo" htmlFor="customer-email">
            <Input
              id="customer-email"
              type="email"
              value={fields.email}
              onChange={(event) => setFields((current) => ({ ...current, email: event.target.value }))}
            />
          </Field>
        </div>
        <Field label="Dirección" htmlFor="customer-address">
          <Input
            id="customer-address"
            value={fields.address}
            onChange={(event) => setFields((current) => ({ ...current, address: event.target.value }))}
          />
        </Field>
        <Field label="Notas" htmlFor="customer-notes">
          <Textarea
            id="customer-notes"
            rows={3}
            value={fields.notes}
            onChange={(event) => setFields((current) => ({ ...current, notes: event.target.value }))}
          />
        </Field>

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
