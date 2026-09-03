import { useState } from 'react';

import type { CustomerListRow, SaveCustomerInput } from '../../api/contracts/customers';
import { Button, Info, SearchInput, useToast } from '../../shared/ui';
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

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(row: CustomerListRow) {
    setEditing(row);
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }
    setModalOpen(false);
    setEditing(null);
    setFormError(null);
  }

  async function handleSubmit(input: SaveCustomerInput) {
    setFormError(null);
    const response = await save(input);

    if (!response.ok) {
      setFormError(response.error.message);
      return;
    }

    pushToast(input.id ? 'Cliente actualizado' : 'Cliente creado', 'success');
    setModalOpen(false);
    setEditing(null);
  }

  if (result.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar los clientes">
        {result.error.message}
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
        <p className="text-sm text-navy-400" aria-live="polite">
          Cargando clientes…
        </p>
      ) : (
        <CustomerTable rows={result.rows} onEdit={openEdit} />
      )}

      <CustomerFormModal
        open={modalOpen}
        customer={editing}
        isSaving={isSaving}
        error={formError}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  );
}
