// @vitest-environment jsdom

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { workOrderRepository } from '../../../src/api/repositories';
import { MechanicMinePage } from '../../../src/features/mechanic/MechanicMinePage';
import { MechanicOrderView } from '../../../src/features/mechanic/MechanicOrderView';
import { MechanicPendingPage } from '../../../src/features/mechanic/MechanicPendingPage';
import { cancelOrder } from '../../../src/mocks/services/work-order-commands';
import { getMockState, resetMockState } from '../../../src/mocks/state';
import { createAuthValue, renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

function mechanicRoutes() {
  return (
    <Routes>
      <Route path="/mechanic/pending" element={<MechanicPendingPage />} />
      <Route path="/mechanic/mine" element={<MechanicMinePage />} />
      <Route path="/mechanic/orders/:id" element={<MechanicOrderView />} />
    </Routes>
  );
}

describe('MechanicPendingPage', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  it('refreshes a stale claim and lets Pedro take an available order', async () => {
    signInAs('MECHANIC');
    const user = userEvent.setup();
    renderWithProviders(mechanicRoutes(), {
      route: '/mechanic/pending',
      auth: createAuthValue('MECHANIC'),
    });

    expect(await screen.findByRole('heading', { name: 'Pendientes' })).toBeVisible();
    expect(screen.getByText('OD-DEMO-061')).toBeVisible();
    expect(screen.getByText('OD-DEMO-062')).toBeVisible();
    expect(screen.queryByText('OD-DEMO-060')).not.toBeInTheDocument();
    expect(screen.queryByText('FAC-000096')).not.toBeInTheDocument();
    expect(screen.queryByText('FAC-000098')).not.toBeInTheDocument();

    const claimedByAnotherMechanic = getMockState().workOrders.find(
      (order) => order.id === 'OD-DEMO-062',
    )!;
    claimedByAnotherMechanic.status = 'IN_PROGRESS';
    claimedByAnotherMechanic.assignedMechanicId = 'U-CARLOS';

    await user.click(screen.getAllByRole('button', { name: 'Tomar orden' })[1]!);

    expect(
      await screen.findByText('Otro mecánico ya tomó esta orden. La cola se actualizó.'),
    ).toBeVisible();
    await waitFor(() => expect(screen.queryByText('OD-DEMO-062')).not.toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Tomar orden' })[0]!);

    expect(await screen.findByText('Orden tomada')).toBeVisible();
    expect(await screen.findByText('Motor de arranque 24V')).toBeVisible();
  });
});

describe('MechanicMinePage and MechanicOrderView', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetMockState();
  });

  it('shows Pedro assigned in-progress work', async () => {
    signInAs('MECHANIC');
    renderWithProviders(mechanicRoutes(), {
      route: '/mechanic/mine',
      auth: createAuthValue('MECHANIC'),
    });

    expect(await screen.findByRole('heading', { name: 'Mis órdenes' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'En proceso' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Historial' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Completadas' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Canceladas' })).toBeVisible();
    expect(screen.getByText('OD-DEMO-060')).toBeVisible();
    expect(screen.getByText('Turbo Garrett')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Continuar' })).toBeVisible();
    expect(screen.queryByText('OD-DEMO-061')).not.toBeInTheDocument();
    expect(screen.getByText('Todavía no hay órdenes terminadas.')).toBeVisible();
    expect(screen.getByText('No hay órdenes canceladas.')).toBeVisible();
  });

  it('keeps Pedro cancelled assigned work under Historial as read-only', async () => {
    signInAs('MECHANIC');
    const user = userEvent.setup();
    const state = getMockState();
    const admin = state.users.find((entry) => entry.role === 'ADMINISTRATOR')!;
    expect(
      cancelOrder(state, admin, {
        workOrderId: 'OD-DEMO-060',
        reason: 'Abandono verificado',
        physicalVerified: true,
      }).ok,
    ).toBe(true);

    renderWithProviders(mechanicRoutes(), {
      route: '/mechanic/mine',
      auth: createAuthValue('MECHANIC'),
    });

    expect(await screen.findByRole('heading', { name: 'Historial' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Canceladas' })).toBeVisible();
    expect(screen.getByText('OD-DEMO-060')).toBeVisible();
    expect(screen.getByText('Turbo Garrett')).toBeVisible();
    expect(screen.getByText('Todavía no hay órdenes terminadas.')).toBeVisible();
    expect(screen.queryByText('No hay órdenes canceladas.')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Continuar' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Ver historial' }));

    expect(
      await screen.findByText(
        'Esta orden fue cancelada. Ya no se puede completar ni agregar evidencia.',
      ),
    ).toBeVisible();
    expect(screen.getByText('Orden cancelada')).toBeVisible();
    expect(screen.getByRole('link', { name: '← Mis órdenes' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Completar desmonte' })).toBeDisabled();
    expect(screen.getByText('Esta orden fue cancelada. No se puede completar.')).toBeVisible();
    expect(screen.queryByLabelText('Después')).not.toBeInTheDocument();
  });

  it('treats a completed order as history, not as work to finish', async () => {
    signInAs('MECHANIC');
    const assigned = getMockState().workOrders.find((order) => order.id === 'OD-DEMO-060')!;
    assigned.status = 'COMPLETED';

    renderWithProviders(mechanicRoutes(), {
      route: '/mechanic/orders/OD-DEMO-060',
      auth: createAuthValue('MECHANIC'),
    });

    expect(
      await screen.findByText('Trabajo terminado. La evidencia queda en el historial.'),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ir a pendientes' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Completar desmonte' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Después')).not.toBeInTheDocument();
  });

  it('completes dismantling after adding the missing AFTER photo', async () => {
    signInAs('MECHANIC');
    const user = userEvent.setup();
    const file = new File(['after'], 'after-turbo.jpg', { type: 'image/jpeg' });

    renderWithProviders(mechanicRoutes(), {
      route: '/mechanic/orders/OD-DEMO-060',
      auth: createAuthValue('MECHANIC'),
    });

    expect(await screen.findByText('Turbo Garrett')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Completar desmonte' })).toBeDisabled();

    await user.upload(screen.getByLabelText('Después'), file);

    expect(await screen.findByText('Foto de después agregada')).toBeVisible();
    const complete = await screen.findByRole('button', { name: 'Completar desmonte' });
    expect(complete).toBeEnabled();
    await user.click(complete);

    expect(await screen.findByRole('link', { name: 'Ir a pendientes' })).toBeVisible();
    expect(screen.getByText('Completada')).toBeVisible();
    expect(screen.getByText('Orden completada')).toBeVisible();
  });

  it('keeps the selected photo and location when a recoverable upload or complete fails', async () => {
    signInAs('MECHANIC');
    const user = userEvent.setup();
    const file = new File(['after'], 'after-turbo.jpg', { type: 'image/jpeg' });

    const addPhoto = vi.spyOn(workOrderRepository, 'addPhoto').mockResolvedValueOnce({
      ok: false,
      error: { code: 'INTERNAL', message: 'HTTP 503: /evidence' },
    });

    renderWithProviders(mechanicRoutes(), {
      route: '/mechanic/orders/OD-DEMO-060',
      auth: createAuthValue('MECHANIC'),
    });

    expect(await screen.findByText('Turbo Garrett')).toBeVisible();
    await user.type(screen.getByLabelText('Ubicación después del desmonte'), 'Patio norte');
    await user.upload(screen.getByLabelText('Después'), file);

    expect(
      await screen.findByText(
        'No hay conexión estable. Lo que ya fotografió o escribió sigue aquí; inténtelo de nuevo.',
      ),
    ).toBeVisible();
    expect(screen.getByText('after-turbo.jpg')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reintentar subida' })).toBeVisible();
    expect(screen.getByLabelText('Ubicación después del desmonte')).toHaveValue('Patio norte');

    addPhoto.mockRestore();
    await user.click(screen.getByRole('button', { name: 'Reintentar subida' }));
    expect(await screen.findByText('Foto de después agregada')).toBeVisible();

    vi.spyOn(workOrderRepository, 'completeDesarme').mockResolvedValueOnce({
      ok: false,
      error: { code: 'INTERNAL', message: 'Failed to fetch' },
    });

    await user.click(screen.getByRole('button', { name: 'Completar desmonte' }));
    expect(await screen.findAllByText(/conexión estable/)).not.toHaveLength(0);
    expect(screen.getByLabelText('Ubicación después del desmonte')).toHaveValue('Patio norte');
    expect(screen.getByText('after-turbo.jpg')).toBeVisible();
  });
});
