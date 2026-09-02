// @vitest-environment jsdom

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InventoryPage } from '../../../src/features/inventory/InventoryPage';
import { getMockState, resetMockState } from '../../../src/mocks/state';
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

  it('registers a simple item and refreshes the inventory list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InventoryPage />, { route: '/inventory' });
    await screen.findByText('Filtro de aceite HD');

    await user.click(screen.getByRole('button', { name: 'Registrar inventario' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('ID interno'), 'ALT-020');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Alternador de mostrador');
    await user.selectOptions(within(dialog).getByLabelText('Categoría'), 'CAT-ALT');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('Alternador de mostrador')).toBeVisible();
    expect(await screen.findByText('ALT-020 quedó registrado')).toBeVisible();
    expect(within(dialog).getByText(/Aún puede completar:/)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Volver al listado' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('registers quantity inventory from the Por cantidad mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InventoryPage />, { route: '/inventory' });
    await screen.findByText('Filtro de aceite HD');

    await user.click(screen.getByRole('button', { name: 'Registrar inventario' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByLabelText('Producto por cantidad'));
    await user.type(within(dialog).getByLabelText('ID interno'), 'QTY-FIL-NEW');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Filtro por caja');
    await user.selectOptions(within(dialog).getByLabelText('Categoría'), 'CAT-FIL');
    await user.clear(within(dialog).getByLabelText('Existencia inicial'));
    await user.type(within(dialog).getByLabelText('Existencia inicial'), '8');
    await user.type(within(dialog).getByLabelText('Costo unitario en pesos'), '300');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('Filtro por caja')).toBeVisible();
    expect(screen.getByText('8 disponibles / 8 en existencia')).toBeVisible();
  });

  it('captures a truck, a present engine and the engine baseline in one wizard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InventoryPage />, { route: '/inventory' });
    await screen.findByText('Filtro de aceite HD');

    await user.click(screen.getByRole('button', { name: 'Registrar inventario' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('ID interno'), 'TRK-020');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Camión con motor recibido');
    await user.selectOptions(within(dialog).getByLabelText('Categoría'), 'CAT-TRK');
    await user.click(within(dialog).getByRole('button', { name: 'Continuar' }));

    const motorGroup = within(dialog).getByRole('group', { name: 'Motor' });
    await user.click(within(motorGroup).getByLabelText('Presente'));
    await user.type(within(motorGroup).getByLabelText('ID del componente'), 'ENG-020');
    await user.clear(within(motorGroup).getByLabelText('Nombre'));
    await user.type(within(motorGroup).getByLabelText('Nombre'), 'Motor dentro del camión');

    const alternatorGroup = within(motorGroup).getByRole('group', { name: 'Alternador' });
    await user.click(within(alternatorGroup).getByLabelText('Presente'));
    await user.type(within(alternatorGroup).getByLabelText('ID del componente'), 'ALT-020');
    const starterGroup = within(motorGroup).getByRole('group', { name: 'Motor de arranque' });
    await user.click(within(starterGroup).getByLabelText('No aplica'));
    const transmissionGroup = within(dialog).getByRole('group', { name: 'Transmisión' });
    await user.click(within(transmissionGroup).getByLabelText('No aplica'));
    await user.click(within(dialog).getByRole('button', { name: 'Registrar ensamblaje' }));

    expect(await screen.findByText('Camión con motor recibido')).toBeVisible();
    expect(getMockState().items.find((item) => item.id === 'ENG-020')).toMatchObject({
      parentId: 'TRK-020',
      complete: false,
    });
    expect(getMockState().items.find((item) => item.id === 'ALT-020')?.parentId).toBe('ENG-020');
    expect(getMockState().knownMissing).toContainEqual(
      expect.objectContaining({ parentId: 'ENG-020', expectedComponentName: 'Turbo' }),
    );
    expect(await screen.findByText('TRK-020 quedó registrado')).toBeVisible();
  });

  it('keeps enrichment fields collapsed until the operator opens them', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InventoryPage />, { route: '/inventory' });
    await screen.findByText('Filtro de aceite HD');

    await user.click(screen.getByRole('button', { name: 'Registrar inventario' }));
    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByLabelText('ID interno')).toBeVisible();
    expect(within(dialog).getByLabelText('Condición')).toBeVisible();
    expect(within(dialog).getByLabelText('Costo en pesos (opcional)')).toBeVisible();
    expect(within(dialog).queryByText('Paso 1 de 2 — Información del ensamblaje')).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Serial (opcional)')).not.toBeVisible();

    await user.click(within(dialog).getByText('Información adicional (opcional)'));
    expect(within(dialog).getByLabelText('Serial (opcional)')).toBeVisible();
  });

  it('announces both assembly steps and keeps checklist data after going back', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InventoryPage />, { route: '/inventory' });
    await screen.findByText('Filtro de aceite HD');

    await user.click(screen.getByRole('button', { name: 'Registrar inventario' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('ID interno'), 'TRK-021');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Camión para volver atrás');
    await user.selectOptions(within(dialog).getByLabelText('Categoría'), 'CAT-TRK');
    expect(within(dialog).getByText('Paso 1 de 2 — Información del ensamblaje')).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Continuar' }));

    expect(within(dialog).getByText('Paso 2 de 2 — Componentes iniciales')).toBeVisible();
    const motorGroup = within(dialog).getByRole('group', { name: 'Motor' });
    await user.click(within(motorGroup).getByLabelText('Presente'));
    await user.type(within(motorGroup).getByLabelText('ID del componente'), 'ENG-021');
    await user.click(within(dialog).getByRole('button', { name: 'Atrás' }));
    expect(within(dialog).getByLabelText('ID interno')).toHaveValue('TRK-021');
    await user.click(within(dialog).getByRole('button', { name: 'Continuar' }));
    expect(
      within(within(dialog).getByRole('group', { name: 'Motor' })).getByLabelText('ID del componente'),
    ).toHaveValue('ENG-021');
  });

  it('ranks inventory states and opens detail from the row or the named link', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/:id" element={<p>Detalle de pieza</p>} />
      </Routes>,
      { route: '/inventory' },
    );
    const engineName = await screen.findByRole('link', { name: /Detroit DD15 Completo/ });
    const engineRow = engineName.closest('tr');
    expect(engineRow).not.toBeNull();
    expect(engineRow).toHaveClass('cursor-pointer');
    expect(engineName).toHaveAttribute('href', '/inventory/ENG-001');
    expect(within(engineRow!).getByText('Comercial')).toBeVisible();
    expect(within(engineRow!).getByText('Físico')).toBeVisible();
    expect(within(engineRow!).getByText('Instalado en Freightliner Cascadia 2018')).toBeVisible();
    expect(within(engineRow!).queryByText('Independiente')).not.toBeInTheDocument();
    expect(within(engineRow!).queryByText(/^Completo$/)).not.toBeInTheDocument();

    const reservedRow = screen.getByRole('link', { name: /Alternador 24V/ }).closest('tr');
    expect(reservedRow).not.toBeNull();
    expect(within(reservedRow!).getByText('Reservado')).toBeVisible();

    const incompleteRow = screen.getByRole('link', { name: /Cummins ISX Incompleto/ }).closest('tr');
    expect(incompleteRow).not.toBeNull();
    expect(within(incompleteRow!).getByText('Independiente')).toBeVisible();
    expect(within(incompleteRow!).getByText('Incompleto')).toBeVisible();

    const protectedRow = screen.getByRole('link', { name: /Detroit DD13 Protegido/ }).closest('tr');
    expect(protectedRow).not.toBeNull();
    expect(within(protectedRow!).getByText('No desarmar')).toBeVisible();

    await user.click(within(engineRow!).getByText('Patio A'));
    expect(await screen.findByText('Detalle de pieza')).toBeVisible();
  });
});
