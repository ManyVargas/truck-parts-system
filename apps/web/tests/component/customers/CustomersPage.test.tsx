// @vitest-environment jsdom

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CustomersPage } from '../../../src/features/customers/CustomersPage';
import { resetMockState } from '../../../src/mocks/state';
import { renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

describe('CustomersPage', () => {
  beforeEach(() => {
    resetMockState();
    signInAs('SELLER');
  });

  afterEach(() => {
    resetMockState();
  });

  it('loads the customer directory and filters by name or RNC', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CustomersPage />, { route: '/customers' });

    expect(await screen.findByText('Transportes del Caribe SRL')).toBeVisible();
    await user.type(screen.getByLabelText('Buscar por nombre o identificación fiscal'), '101-98765');

    expect(await screen.findByText('Logística Norte SA')).toBeVisible();
    expect(screen.queryByText('Transportes del Caribe SRL')).not.toBeInTheDocument();
  });

  it('creates a customer and refreshes the directory', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CustomersPage />, { route: '/customers' });
    await screen.findByText('Transportes del Caribe SRL');

    await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
    await user.type(screen.getByLabelText('Nombre'), 'Flota Este');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Cliente creado')).toBeVisible();
    expect(await screen.findByText('Flota Este')).toBeVisible();
  });

  it('keeps Cliente Contado visible but without an edit action', async () => {
    renderWithProviders(<CustomersPage />, { route: '/customers' });

    const cashCustomer = await screen.findByText('Cliente Contado');
    const row = cashCustomer.closest('tr');
    expect(row).not.toBeNull();
    const editButton = row ? within(row).getByRole('button', { name: 'Editar' }) : null;

    expect(editButton).toBeDisabled();
    expect(editButton).toHaveAttribute('title', 'Cliente Contado no se puede editar');
  });
});
