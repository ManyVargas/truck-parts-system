// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

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
