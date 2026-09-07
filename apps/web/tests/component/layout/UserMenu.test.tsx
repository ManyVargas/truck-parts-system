// @vitest-environment jsdom

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { UserMenu } from '../../../src/shared/layout/UserMenu';
import { createAuthValue, renderWithProviders } from '../../support/render';
import '../../support/dom';

describe('UserMenu', () => {
  it('shows Mi perfil and navigates a seller to /profile', async () => {
    const user = userEvent.setup();
    const auth = createAuthValue('SELLER');

    renderWithProviders(
      <>
        <UserMenu user={auth.user!} onLogout={auth.logout} />
        <Routes>
          <Route path="/profile" element={<div>Página de perfil</div>} />
        </Routes>
      </>,
      { route: '/dashboard', auth },
    );

    await user.click(screen.getByRole('button', { name: /Cuenta de SELLER/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Mi perfil' }));

    expect(await screen.findByText('Página de perfil')).toBeVisible();
  });

  it('closes the menu with Escape', async () => {
    const user = userEvent.setup();
    const auth = createAuthValue('SELLER');

    renderWithProviders(<UserMenu user={auth.user!} onLogout={auth.logout} />, { auth });

    await user.click(screen.getByRole('button', { name: /Cuenta de SELLER/i }));
    expect(screen.getByRole('menu')).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('asks before logging out and stays signed in if cancelled', async () => {
    const user = userEvent.setup();
    const logout = vi.fn(async () => undefined);
    const auth = createAuthValue('SELLER');

    renderWithProviders(<UserMenu user={auth.user!} onLogout={logout} />, { auth });

    await user.click(screen.getByRole('button', { name: /Cuenta de SELLER/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));

    const dialog = await screen.findByRole('dialog', { name: 'Cerrar sesión' });
    expect(logout).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it('logs out only after confirmation', async () => {
    const user = userEvent.setup();
    const logout = vi.fn(async () => undefined);
    const auth = createAuthValue('SELLER');

    renderWithProviders(<UserMenu user={auth.user!} onLogout={logout} />, { auth });

    await user.click(screen.getByRole('button', { name: /Cuenta de SELLER/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));

    const dialog = await screen.findByRole('dialog', { name: 'Cerrar sesión' });
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar sesión' }));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('navigates a mechanic to /mechanic/profile', async () => {
    const user = userEvent.setup();
    const auth = createAuthValue('MECHANIC');

    renderWithProviders(
      <>
        <UserMenu user={auth.user!} onLogout={auth.logout} />
        <Routes>
          <Route path="/mechanic/profile" element={<div>Perfil mecánico</div>} />
        </Routes>
      </>,
      { route: '/mechanic/pending', auth },
    );

    await user.click(screen.getByRole('button', { name: /Cuenta de MECHANIC/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Mi perfil' }));

    expect(await screen.findByText('Perfil mecánico')).toBeVisible();
  });
});
