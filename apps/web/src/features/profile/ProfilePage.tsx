import { useState } from 'react';

import type { UpdateOwnProfileInput } from '../../api/contracts/profile';
import { PageHeader } from '../../shared/layout/PageHeader';
import { Info, useToast } from '../../shared/ui';
import { ProfileForm } from './ProfileForm';
import { useProfile } from './useProfile';

export function ProfilePage() {
  const { user, isSaving, save } = useProfile();
  const { pushToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  async function handleSubmit(input: UpdateOwnProfileInput) {
    setError(null);
    const response = await save(input);

    if (!response.ok) {
      setError(response.error.message);
      return;
    }

    pushToast('Perfil actualizado', 'success');
  }

  return (
    <>
      <PageHeader
        title="Mi perfil"
        description="Actualice su nombre y datos de contacto. El usuario, el rol y el estado de la cuenta los gestiona un administrador."
      />
      <Info tone="info" title="Datos de acceso">
        El nombre de usuario no se puede cambiar desde aquí. Solo un administrador puede asignar rol
        o desactivar la cuenta.
      </Info>
      <div className="mt-6">
        <ProfileForm user={user} isSaving={isSaving} error={error} onSubmit={handleSubmit} />
      </div>
    </>
  );
}
