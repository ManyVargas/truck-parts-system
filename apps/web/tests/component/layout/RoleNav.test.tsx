// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { CAPABILITY_PRESETS } from '../../../src/shared/config/capabilities';
import { AppShell } from '../../../src/shared/layout/AppShell';
import { RoleNav } from '../../../src/shared/layout/RoleNav';
import { createAuthValue, renderWithProviders } from '../../support/render';
import '../../support/dom';

describe('RoleNav', () => {
  it('groups administrator links and marks the current page', () => {
    renderWithProviders(<RoleNav role="ADMINISTRATOR" />, { route: '/sales' });

    expect(screen.getByRole('heading', { name: 'Operación' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Administración' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Finanzas y control' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ventas y Facturas' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
  });

  it('keeps the seller menu flat because every item shares one intent', () => {
    renderWithProviders(<RoleNav role="SELLER" />, {
      route: '/dashboard',
      auth: createAuthValue('SELLER'),
    });

    expect(screen.queryByRole('heading', { name: 'Operación' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clientes' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
  });

  it('hides group headings whose capabilities are off', () => {
    renderWithProviders(<RoleNav role="ADMINISTRATOR" />, {
      route: '/users',
      capabilities: CAPABILITY_PRESETS['release-1'],
    });

    expect(screen.getByRole('heading', { name: 'Operación' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Administración' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Finanzas y control' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Inventario' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('AppShell sidebar', () => {
  it('does not show a section count', () => {
    renderWithProviders(
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<p>Inicio</p>} />
        </Route>
      </Routes>,
      { route: '/dashboard' },
    );

    expect(screen.queryByText(/sección/i)).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  });
});
