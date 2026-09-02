// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProfilePage } from '../../../src/features/profile/ProfilePage';
import { getMockState, resetMockState } from '../../../src/mocks/state';
import { createAuthValue, renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

function sellerAuth() {
  const auth = createAuthValue('SELLER');
  auth.user = {
    id: 'U-LAURA',
    name: 'Laura Pérez',
    username: 'laura',
    role: 'SELLER',
    active: true,
    phone: '809-555-0101',
  };
  auth.session = { userId: 'U-LAURA', createdAt: '2026-08-25T16:00:00.000Z' };
  return auth;
}

describe('ProfilePage', () => {
  beforeEach(() => {
    resetMockState();
    signInAs('SELLER');
  });

  afterEach(() => {
    resetMockState();
  });

  it('shows username and role as read-only and submits contact changes', async () => {
    const user = userEvent.setup();
    const auth = sellerAuth();
    renderWithProviders(<ProfilePage />, { route: '/profile', auth });

    expect(screen.getByLabelText('Usuario')).toBeDisabled();
    expect(screen.getByLabelText('Usuario')).toHaveValue('laura');
    expect(screen.getByLabelText('Rol')).toBeDisabled();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Laura Pérez');

    const phone = screen.getByLabelText('Teléfono');
    await user.clear(phone);
    await user.type(phone, '809-555-8888');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Perfil actualizado')).toBeVisible();
    expect(auth.refresh).toHaveBeenCalled();
    expect(getMockState().users.find((entry) => entry.id === 'U-LAURA')?.phone).toBe(
      '809-555-8888',
    );
  });
});
