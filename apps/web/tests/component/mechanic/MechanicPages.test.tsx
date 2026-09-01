// @vitest-environment jsdom

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MechanicMinePage } from '../../../src/features/mechanic/MechanicMinePage';
import { MechanicOrderView } from '../../../src/features/mechanic/MechanicOrderView';
import { MechanicPendingPage } from '../../../src/features/mechanic/MechanicPendingPage';
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

    expect(await screen.findByText('Esta OT ya fue tomada')).toBeVisible();
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
    resetMockState();
  });

  it('shows Pedro assigned in-progress work', async () => {
    signInAs('MECHANIC');
    renderWithProviders(mechanicRoutes(), {
      route: '/mechanic/mine',
      auth: createAuthValue('MECHANIC'),
    });

    expect(await screen.findByRole('heading', { name: 'Mis órdenes' })).toBeVisible();
    expect(screen.getByText('OD-DEMO-060')).toBeVisible();
    expect(screen.getByText('Turbo Garrett')).toBeVisible();
    expect(screen.queryByText('OD-DEMO-061')).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Completar desarme' })).toBeDisabled();

    await user.upload(screen.getByLabelText('AFTER'), file);

    expect(await screen.findByText('Foto AFTER agregada')).toBeVisible();
    const complete = await screen.findByRole('button', { name: 'Completar desarme' });
    expect(complete).toBeEnabled();
    await user.click(complete);

    expect(await screen.findByText('Orden completada')).toBeVisible();
    expect(screen.getByText('Completada')).toBeVisible();
  });
});
