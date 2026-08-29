// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InventoryPage } from '../../../src/features/inventory/InventoryPage';
import { resetMockState } from '../../../src/mocks/state';
import { renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

describe('InventoryPage', () => {
  beforeEach(() => {
    resetMockState();
    signInAs('SELLER');
  });

  afterEach(() => {
    resetMockState();
  });

  it('loads individual and quantity inventory while hiding sold items', async () => {
    renderWithProviders(<InventoryPage />, { route: '/inventory' });

    expect(await screen.findByRole('heading', { name: 'Inventario' })).toBeVisible();
    expect(await screen.findByText('Filtro de aceite HD')).toBeVisible();
    expect(screen.getByText('Aceite 15W-40 Galón')).toBeVisible();
    expect(screen.queryByText('Turbo Garrett')).not.toBeInTheDocument();
  });

  it('filters by practical identifiers and can include sold history', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InventoryPage />, { route: '/inventory' });
    await screen.findByText('Filtro de aceite HD');

    await user.type(screen.getByLabelText('Buscar inventario'), 'LF9009');
    expect(await screen.findByText('Filtro de aceite HD')).toBeVisible();
    expect(screen.queryByText('Motor Detroit DD15')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Buscar inventario'));
    await user.click(screen.getByRole('checkbox', { name: 'Mostrar vendidos' }));
    expect(await screen.findByText('Turbo Garrett')).toBeVisible();
  });

  it('shows an empty state when no inventory matches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InventoryPage />, { route: '/inventory' });
    await screen.findByText('Filtro de aceite HD');

    await user.type(screen.getByLabelText('Buscar inventario'), 'NO-EXISTE-999');

    expect(await screen.findByText('Sin resultados')).toBeVisible();
  });
});
