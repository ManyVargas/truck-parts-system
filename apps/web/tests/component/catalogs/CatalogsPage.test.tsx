// @vitest-environment jsdom

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CatalogsPage } from '../../../src/features/catalogs/CatalogsPage';
import { InventoryPage } from '../../../src/features/inventory/InventoryPage';
import { resetMockState } from '../../../src/mocks/state';
import { renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

describe('CatalogsPage', () => {
  beforeEach(() => {
    resetMockState();
    signInAs('ADMINISTRATOR');
  });

  afterEach(() => {
    resetMockState();
  });

  it('creates a category that appears in inventory registration', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<CatalogsPage />, { route: '/catalogs' });

    expect(await screen.findByText('Motor')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    await user.type(screen.getByLabelText('Nombre'), 'Bomba');
    await user.type(screen.getByLabelText('Prefijo de código'), 'BOM');
    await user.click(screen.getByLabelText(/Es ensamblaje/));
    await user.type(screen.getByLabelText('Componentes esperados'), 'Disco\nTuerca');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Categoría creada')).toBeVisible();
    expect(await screen.findByText('Bomba')).toBeVisible();

    unmount();
    renderWithProviders(<InventoryPage />, { route: '/inventory' });
    await screen.findByText('Filtro de aceite HD');
    await user.click(screen.getByRole('button', { name: 'Registrar inventario' }));
    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByRole('option', { name: /Bomba/ })).toBeInTheDocument();
  });

  it('defines category attributes that appear as registration fields', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<CatalogsPage />, { route: '/catalogs' });

    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    await user.type(screen.getByLabelText('Nombre'), 'Sensor');
    await user.type(screen.getByLabelText('Prefijo de código'), 'SEN');
    await user.click(screen.getByRole('button', { name: 'Añadir atributo' }));
    expect(screen.queryByLabelText('Clave')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Etiqueta'), 'Señal');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'text');
    await user.click(screen.getByLabelText('Obligatorio al registrar'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Categoría creada')).toBeVisible();
    expect(await screen.findByText('Señal')).toBeVisible();

    unmount();
    renderWithProviders(<InventoryPage />, { route: '/inventory' });
    await screen.findByText('Filtro de aceite HD');
    await user.click(screen.getByRole('button', { name: 'Registrar inventario' }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Categoría'), 'CAT-SENSOR');

    expect(within(dialog).getByLabelText('Señal')).toBeVisible();
    expect(within(dialog).queryByLabelText('Atributos (opcional)')).not.toBeInTheDocument();
  });

  it('keeps the edit dialog open and shows an error when an expected name is repeated', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CatalogsPage />, { route: '/catalogs' });

    const motorRow = (await screen.findByText('MOT')).closest('tr');
    expect(motorRow).not.toBeNull();
    await user.click(within(motorRow!).getByRole('button', { name: 'Editar' }));

    const expectedField = screen.getByLabelText('Componentes esperados');
    await user.clear(expectedField);
    await user.type(expectedField, 'Alternador\nTurbo\nMotor de arranque\nAlternador');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('No se pudo guardar')).toBeVisible();
    expect(screen.getByText(/El componente esperado «Alternador» ya está en la lista/)).toBeVisible();
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.queryByText('Categoría actualizada')).not.toBeInTheDocument();
  });

  it('deactivates a mechanical service from the services tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CatalogsPage />, { route: '/catalogs' });
    await screen.findByText('Motor');

    await user.click(screen.getByRole('tab', { name: 'Servicios' }));
    expect(await screen.findByText('Diagnóstico electrónico')).toBeVisible();

    const row = screen.getByText('Instalación mecánica').closest('tr');
    expect(row).not.toBeNull();
    await user.click(within(row!).getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByText('Servicio desactivado')).toBeVisible();
  });
});
