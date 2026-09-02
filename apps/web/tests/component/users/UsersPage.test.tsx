// @vitest-environment jsdom

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { UsersPage } from '../../../src/features/users/UsersPage';
import { mockAuthRepository } from '../../../src/mocks/repositories/MockAuthRepository';
import { resetMockState } from '../../../src/mocks/state';
import { renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

describe('UsersPage', () => {
  beforeEach(() => {
    resetMockState();
    signInAs('ADMINISTRATOR');
  });

  afterEach(() => {
    resetMockState();
  });

  it('creates a user that can authenticate with the assigned password', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />, { route: '/users' });

    expect(await screen.findByText('Laura Pérez')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
    await user.type(screen.getByLabelText('Nombre'), 'María López');
    await user.type(screen.getByLabelText('Usuario'), 'maria');
    await user.type(screen.getByLabelText('Contraseña'), 'clave123');
    await user.selectOptions(screen.getByLabelText('Rol'), 'SELLER');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Usuario creado')).toBeVisible();
    expect(await screen.findByText('María López')).toBeVisible();

    const login = await mockAuthRepository.login('maria', 'clave123');
    expect(login.ok).toBe(true);
  });

  it('shows Carlos as inactive and can filter by username', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />, { route: '/users' });

    const carlos = await screen.findByText('Carlos Méndez');
    const row = carlos.closest('tr');
    expect(row).not.toBeNull();
    expect(within(row!).getByText('Inactivo')).toBeVisible();

    await user.type(screen.getByLabelText('Buscar por nombre o usuario'), 'pedro');
    expect(await screen.findByText('Pedro Santana')).toBeVisible();
    expect(screen.queryByText('Laura Pérez')).not.toBeInTheDocument();
  });
});
