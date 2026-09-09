import { useState } from 'react';

import type { CustomerListRow, SaveCustomerInput } from '../../api/contracts/customers';
import { presentAppError } from '../../shared/errors/present-app-error';
import { Button, Info, SearchInput, Skeleton, toPageLoadMessage, useToast } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerTable } from './CustomerTable';
import { useCustomers } from './useCustomers';

export function CustomersPage() {
  const { query, setQuery, result, isSaving, save } = useCustomers();
  const { pushToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerListRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(row: CustomerListRow) {
    setEditing(row);
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }
    setModalOpen(false);
    setEditing(null);
    setFormError(null);
    setFieldErrors({});
  }

  async function handleSubmit(input: SaveCustomerInput) {
    setFormError(null);
    setFieldErrors({});
    const response = await save(input);

    if (!response.ok) {
      const presented = presentAppError(response.error);
      setFormError(presented.summary);
      setFieldErrors(presented.fields);
      return;
    }

    pushToast(input.id ? 'Cliente actualizado' : 'Cliente creado', 'success');
    setModalOpen(false);
    setEditing(null);
  }

  if (result.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar los clientes">
        {toPageLoadMessage(result.error.message, 'No pudimos cargar los clientes.')}
      </Info>
    );
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Directorio reutilizable para facturación. Cliente Contado queda como predeterminado y no se edita."
        actions={
          <Button onClick={openCreate} disabled={result.status === 'loading'}>
            Nuevo cliente
          </Button>
        }
      />

      <div className="mb-6 max-w-md">
        <SearchInput
          id="customer-search"
          label="Buscar por nombre o identificación fiscal"
          placeholder="Nombre o identificación fiscal / cédula"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {result.status === 'loading' ? (
        <Skeleton label="Cargando clientes" />
      ) : (
        <CustomerTable rows={result.rows} onEdit={openEdit} />
      )}

      <CustomerFormModal
        open={modalOpen}
        customer={editing}
        isSaving={isSaving}
        error={formError}
        fieldErrors={fieldErrors}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  );
}
