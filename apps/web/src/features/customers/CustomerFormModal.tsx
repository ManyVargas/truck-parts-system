import { useEffect, useRef, useState, type FormEvent } from 'react';

import type { Customer } from '../../api/contracts/entities';
import type { SaveCustomerContactInput, SaveCustomerInput } from '../../api/contracts/customers';
import { Button, Field, Info, Input, Modal, Textarea } from '../../shared/ui';

export type CustomerFormModalProps = {
  open: boolean;
  customer: Customer | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: SaveCustomerInput) => void;
};

type ContactDraft = {
  key: string;
  id?: string;
  name: string;
  phone: string;
  email: string;
  title: string;
  isPrimary: boolean;
};

type FormFields = {
  name: string;
  rnc: string;
  address: string;
  notes: string;
  contacts: ContactDraft[];
};

const EMPTY_FIELDS: FormFields = {
  name: '',
  rnc: '',
  address: '',
  notes: '',
  contacts: [],
};

function toSaveContacts(drafts: ContactDraft[]): SaveCustomerContactInput[] {
  return drafts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    title: contact.title,
    isPrimary: contact.isPrimary || undefined,
  }));
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
  const nextKeyRef = useRef(0);
  const isEdit = customer != null;

  useEffect(() => {
    if (!open) {
      return;
    }

    nextKeyRef.current = 0;
    if (!customer) {
      setFields(EMPTY_FIELDS);
      return;
    }

    setFields({
      name: customer.name,
      rnc: customer.rnc ?? '',
      address: customer.address ?? '',
      notes: customer.notes ?? '',
      contacts: customer.contacts.map((contact) => {
        nextKeyRef.current += 1;
        return {
          key: contact.id || `contact-draft-${nextKeyRef.current}`,
          id: contact.id,
          name: contact.name ?? '',
          phone: contact.phone ?? '',
          email: contact.email ?? '',
          title: contact.title ?? '',
          isPrimary: contact.isPrimary === true,
        };
      }),
    });
  }, [open, customer]);

  function addContact() {
    nextKeyRef.current += 1;
    setFields((current) => ({
      ...current,
      contacts: [
        ...current.contacts,
        {
          key: `contact-draft-${nextKeyRef.current}`,
          name: '',
          phone: '',
          email: '',
          title: '',
          isPrimary: current.contacts.length === 0,
        },
      ],
    }));
  }

  function updateContact(key: string, patch: Partial<ContactDraft>) {
    setFields((current) => ({
      ...current,
      contacts: current.contacts.map((contact) => {
        if (contact.key !== key) {
          if (patch.isPrimary === true) {
            return { ...contact, isPrimary: false };
          }
          return contact;
        }
        return { ...contact, ...patch };
      }),
    }));
  }

  function removeContact(key: string) {
    setFields((current) => ({
      ...current,
      contacts: current.contacts.filter((contact) => contact.key !== key),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      id: customer?.id,
      name: fields.name,
      rnc: fields.rnc,
      address: fields.address,
      notes: fields.notes,
      contacts: toSaveContacts(fields.contacts),
    });
  }

  return (
    <Modal open={open} title={isEdit ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Info tone="error" title="No se pudo guardar">
            {error}
          </Info>
        )}
        <Field label="Nombre" htmlFor="customer-name">
          <Input
            id="customer-name"
            value={fields.name}
            onChange={(event) => setFields((current) => ({ ...current, name: event.target.value }))}
            required
            autoFocus
          />
        </Field>
        <Field label="Identificación fiscal / cédula" htmlFor="customer-rnc" hint="Opcional en ventas no fiscales">
          <Input
            id="customer-rnc"
            value={fields.rnc}
            onChange={(event) => setFields((current) => ({ ...current, rnc: event.target.value }))}
          />
        </Field>
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

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-navy">Contactos</p>
            <Button type="button" variant="secondary" size="sm" onClick={addContact}>
              Agregar contacto
            </Button>
          </div>

          {fields.contacts.map((contact, index) => (
            <div
              key={contact.key}
              className="space-y-3 rounded-lg border border-navy-100 bg-navy-50/40 p-3"
            >
              <Field
                label="Nombre del contacto"
                htmlFor={`contact-${index}-name`}
                hint="Opcional si el contacto es la misma persona"
              >
                <Input
                  id={`contact-${index}-name`}
                  value={contact.name}
                  onChange={(event) => updateContact(contact.key, { name: event.target.value })}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Teléfono" htmlFor={`contact-${index}-phone`}>
                  <Input
                    id={`contact-${index}-phone`}
                    value={contact.phone}
                    onChange={(event) => updateContact(contact.key, { phone: event.target.value })}
                  />
                </Field>
                <Field label="Correo" htmlFor={`contact-${index}-email`}>
                  <Input
                    id={`contact-${index}-email`}
                    type="email"
                    value={contact.email}
                    onChange={(event) => updateContact(contact.key, { email: event.target.value })}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <Field label="Cargo" htmlFor={`contact-${index}-title`}>
                  <Input
                    id={`contact-${index}-title`}
                    value={contact.title}
                    onChange={(event) => updateContact(contact.key, { title: event.target.value })}
                  />
                </Field>
                <label
                  htmlFor={`contact-${index}-primary`}
                  className="flex h-10 items-center gap-2 text-sm text-navy"
                >
                  <input
                    id={`contact-${index}-primary`}
                    type="checkbox"
                    checked={contact.isPrimary}
                    onChange={(event) =>
                      updateContact(contact.key, { isPrimary: event.target.checked })
                    }
                  />
                  Principal
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => removeContact(contact.key)}
                >
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </div>

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
