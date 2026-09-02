// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InventoryDetailPage } from '../../../src/features/inventory/InventoryDetailPage';
import { resetMockState } from '../../../src/mocks/state';
import { createAuthValue, renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

function detailRoute() {
  return (
    <Routes>
      <Route path="/inventory/:id" element={<InventoryDetailPage />} />
    </Routes>
  );
}

describe('InventoryDetailPage', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  it('shows hierarchy, missing components and administrator actions', async () => {
    signInAs('ADMINISTRATOR');
    renderWithProviders(detailRoute(), {
      route: '/inventory/ENG-002',
      auth: createAuthValue('ADMINISTRATOR'),
    });

    expect(await screen.findByRole('heading', { name: 'Cummins ISX Incompleto' })).toBeVisible();
    expect(screen.getByText(/Ensamblaje · Motor/)).toBeVisible();
    expect(screen.getByText('Completitud')).toBeVisible();
    expect(screen.getAllByText('Incompleto').length).toBeGreaterThan(0);
    expect(screen.getByText(/Turbo \(en recepción\)/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Corregir baseline' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Orden de trabajo manual' })).toBeVisible();
  });

  it('hides administrator actions from sellers', async () => {
    signInAs('SELLER');
    renderWithProviders(detailRoute(), {
      route: '/inventory/FLT-001',
      auth: createAuthValue('SELLER'),
    });

    expect(await screen.findByRole('heading', { name: 'Filtro de aceite HD' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Agregar a borrador' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Corregir costo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Orden de trabajo manual' })).not.toBeInTheDocument();
  });

  it('renders quantity stock separately from individual item state', async () => {
    signInAs('SELLER');
    renderWithProviders(detailRoute(), {
      route: '/inventory/QTY-OIL-15W40',
      auth: createAuthValue('SELLER'),
    });

    expect(await screen.findByRole('heading', { name: 'Aceite 15W-40 Galón' })).toBeVisible();
    expect(screen.getByText('48')).toBeVisible();
    expect(screen.getByText('46')).toBeVisible();
    expect(screen.getByText('disponible = existencia − reservado')).toBeVisible();
  });

  it('reports an unknown inventory identifier', async () => {
    signInAs('SELLER');
    renderWithProviders(detailRoute(), {
      route: '/inventory/NO-EXISTE',
      auth: createAuthValue('SELLER'),
    });

    expect(await screen.findByText('No se pudo cargar el detalle')).toBeVisible();
    expect(screen.getByText('Inventario no encontrado')).toBeVisible();
  });
});
