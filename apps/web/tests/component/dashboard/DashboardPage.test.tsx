// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DashboardPage } from '../../../src/features/dashboard/DashboardPage';
import { mockCategoryRepository } from '../../../src/mocks/repositories/MockCategoryRepository';
import { resetMockState } from '../../../src/mocks/state';
import { renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

describe('DashboardPage', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  it('shows profitability and FX information to administrators', async () => {
    signInAs('ADMINISTRATOR');
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible();
    expect(screen.getByText('Utilidad DOP')).toBeVisible();
    expect(screen.getByText('FX pendiente')).toBeVisible();
    expect(screen.getByText('RD$8,900.00')).toBeVisible();
  });

  it('shows draft count instead of profitability to sellers', async () => {
    signInAs('SELLER');
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('Borradores')).toBeVisible();
    expect(screen.queryByText('Utilidad DOP')).not.toBeInTheDocument();
    expect(screen.queryByText('FX pendiente')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Catálogo: ensamblajes afectados por un componente nuevo'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Componentes por validar')).not.toBeInTheDocument();
  });

  it('shows a catalog-review banner to administrators after a new expected component is added', async () => {
    signInAs('ADMINISTRATOR');
    await mockCategoryRepository.save({
      id: 'CAT-ENG',
      name: 'Motor',
      isAssembly: true,
      expectedComponents: ['Alternador', 'Turbo', 'Motor de arranque', 'Bomba de aceite'],
    });

    renderWithProviders(<DashboardPage />);

    expect(
      await screen.findByText('Catálogo: ensamblajes afectados por un componente nuevo'),
    ).toBeVisible();
    expect(screen.getByText('Componentes por validar')).toBeVisible();
    expect(screen.getByRole('link', { name: /Detroit DD15 Completo \(ENG-001\)/ })).toBeVisible();
    expect(screen.getAllByText(/ahora motor espera Bomba de aceite/i).length).toBeGreaterThan(0);
  });

  it('renders an authorization error for mechanics', async () => {
    signInAs('MECHANIC');
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('No se pudo cargar el dashboard')).toBeVisible();
    expect(screen.getByText('No tiene permiso para realizar esta acción')).toBeVisible();
  });
});
