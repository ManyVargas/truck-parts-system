// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { GuestRoute } from '../../../src/shared/layout/GuestRoute';
import { ProtectedRoute } from '../../../src/shared/layout/ProtectedRoute';
import { RouteAccessGuard } from '../../../src/shared/layout/RouteAccessGuard';
import { CAPABILITY_PRESETS } from '../../../src/shared/config/capabilities';
import { createAuthValue, renderWithProviders } from '../../support/render';
import '../../support/dom';

describe('access guards', () => {
  it('redirects guests from a protected route to login', async () => {
    const guest = { ...createAuthValue(), user: null, session: null };

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Inicio de sesión</div>} />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute roles={['ADMINISTRATOR', 'SELLER']}>
              <div>Inventario privado</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { route: '/inventory', auth: guest },
    );

    expect(await screen.findByText('Inicio de sesión')).toBeVisible();
    expect(screen.queryByText('Inventario privado')).not.toBeInTheDocument();
  });

  it('redirects an authenticated seller away from login to the role home', async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <div>Inicio de sesión</div>
            </GuestRoute>
          }
        />
        <Route path="/dashboard" element={<div>Inicio vendedor</div>} />
      </Routes>,
      { route: '/login', auth: createAuthValue('SELLER') },
    );

    expect(await screen.findByText('Inicio vendedor')).toBeVisible();
  });

  it('shows unauthorized for a mechanic entering a known desktop route', async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/inventory"
          element={
            <ProtectedRoute roles={['ADMINISTRATOR', 'SELLER']}>
              <div>Inventario privado</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { route: '/inventory', auth: createAuthValue('MECHANIC') },
    );

    expect(await screen.findByRole('heading', { name: 'Acceso no autorizado' })).toBeVisible();
  });

  it('distinguishes an unknown path from a forbidden desktop route', async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="*"
          element={
            <ProtectedRoute roles={['ADMINISTRATOR', 'SELLER']}>
              <div>Contenido privado</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { route: '/invenray', auth: createAuthValue('MECHANIC') },
    );

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
    expect(screen.queryByText('Acceso no autorizado')).not.toBeInTheDocument();
  });

  it('blocks administrator-only sections inside the desktop shell', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<RouteAccessGuard />}>
          <Route path="/users" element={<div>Gestión de usuarios</div>} />
        </Route>
      </Routes>,
      { route: '/users', auth: createAuthValue('SELLER') },
    );

    expect(await screen.findByRole('heading', { name: 'Acceso no autorizado' })).toBeVisible();
    expect(screen.queryByText('Gestión de usuarios')).not.toBeInTheDocument();
  });

  it('blocks a known route when its capability is disabled even for an administrator', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<RouteAccessGuard />}>
          <Route path="/inventory" element={<div>Inventario visible</div>} />
        </Route>
      </Routes>,
      {
        route: '/inventory',
        auth: createAuthValue('ADMINISTRATOR'),
        capabilities: CAPABILITY_PRESETS['release-1'],
      },
    );

    expect(await screen.findByRole('heading', { name: 'Acceso no autorizado' })).toBeVisible();
    expect(screen.queryByText('Inventario visible')).not.toBeInTheDocument();
  });
});
