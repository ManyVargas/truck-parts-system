import { useState } from 'react';

import type { ManagedUser, SaveUserInput } from '../../api/contracts/users';
import { Button, Info, SearchInput, useToast } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';
import { UserFormModal } from './UserFormModal';
import { UserTable } from './UserTable';
import { useUsers } from './useUsers';

export function UsersPage() {
  const { query, setQuery, result, isSaving, save } = useUsers();
  const { pushToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
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

  async function handleSubmit(input: SaveUserInput) {
    setFormError(null);
    const response = await save(input);
    if (!response.ok) {
      setFormError(response.error.message);
      return;
    }

    pushToast(input.id ? 'Usuario actualizado' : 'Usuario creado', 'success');
    setModalOpen(false);
    setEditing(null);
  }

  async function handleToggleActive(row: ManagedUser) {
    setTogglingId(row.id);
    const response = await save({
      id: row.id,
      name: row.name,
      username: row.username,
      role: row.role,
      active: !row.active,
      phone: row.phone,
      email: row.email,
    });
    setTogglingId(null);

    if (!response.ok) {
      pushToast(response.error.message, 'error');
      return;
    }

    pushToast(row.active ? 'Usuario desactivado' : 'Usuario activado', 'success');
  }

  if (result.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar los usuarios">
        {result.error.message}
      </Info>
    );
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Cuentas individuales. La contraseña es obligatoria al crear; desactivar impide el próximo inicio de sesión."
        actions={
          <Button onClick={openCreate} disabled={result.status === 'loading'}>
            Nuevo usuario
          </Button>
        }
      />

      <div className="mb-6 max-w-md">
        <SearchInput
          id="user-search"
          label="Buscar por nombre o usuario"
          placeholder="Nombre o usuario"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {result.status === 'loading' ? (
        <p className="text-sm text-navy-400" aria-live="polite">
          Cargando usuarios…
        </p>
      ) : (
        <UserTable
          rows={result.rows}
          togglingId={togglingId}
          onEdit={(row) => {
            setEditing(row);
            setFormError(null);
            setModalOpen(true);
          }}
          onToggleActive={(row) => {
            void handleToggleActive(row);
          }}
        />
      )}

      <UserFormModal
        open={modalOpen}
        user={editing}
        isSaving={isSaving}
        error={formError}
        onClose={closeModal}
        onSubmit={(input) => {
          void handleSubmit(input);
        }}
      />
    </>
  );
}
