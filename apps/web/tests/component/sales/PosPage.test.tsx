// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { PosPage } from '../../../src/features/sales/PosPage';
import { mockCustomerRepository } from '../../../src/mocks/repositories/MockCustomerRepository';
import { resetMockState } from '../../../src/mocks/state';
import { renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

function renderPos(draftId = 'INV-DRAFT-01') {
  return renderWithProviders(
    <Routes>
      <Route path="/sales/draft/:id" element={<PosPage />} />
    </Routes>,
    { route: `/sales/draft/${draftId}` },
  );
}

describe('PosPage', () => {
  beforeEach(() => {
    resetMockState();
    signInAs('SELLER');
  });

  afterEach(() => {
    resetMockState();
  });

  it('loads the seed draft with nonfiscal ITBIS at zero', async () => {
    renderPos();

    expect(await screen.findByText('Alternador 24V')).toBeVisible();
    expect(screen.getByText('Aceite 15W-40 Galón')).toBeVisible();
    expect(screen.getByTestId('pos-itbis')).toHaveTextContent('RD$0.00');
    expect(screen.getByText('Transportes del Caribe SRL', { exact: false })).toBeVisible();
  });

  it('recalculates included ITBIS when fiscal mode is enabled', async () => {
    const user = userEvent.setup();
    renderPos();
    await screen.findByText('Alternador 24V');

    await user.click(screen.getByLabelText(/Factura con comprobante fiscal/));

    expect(await screen.findByTestId('pos-itbis')).not.toHaveTextContent('RD$0.00');
  });

  it('confirms the seed draft and shows the assigned FAC number', async () => {
    const user = userEvent.setup();
    renderPos();
    await screen.findByText('Alternador 24V');

    await user.click(screen.getByRole('button', { name: 'Confirmar venta' }));
    const confirmButtons = screen.getAllByRole('button', { name: 'Confirmar venta' });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(await screen.findByText('Venta confirmada')).toBeVisible();
    expect(screen.getByText(/Orden de desarme: OD-DEMO-064/)).toBeVisible();
  });

  it('lists a newly created customer in the selector', async () => {
    await mockCustomerRepository.save({ name: 'Flota Este', rnc: '1-23-45678-9' });

    renderPos();

    expect(await screen.findByRole('option', { name: /Flota Este/ })).toBeVisible();
  });

  it('does not offer inactive seed services when adding a line', async () => {
    const user = userEvent.setup();
    renderPos();
    await screen.findByText('Alternador 24V');

    await user.click(screen.getByRole('button', { name: 'Agregar línea' }));
    await user.selectOptions(screen.getByLabelText('Tipo de línea'), 'SERVICE');

    expect(screen.getByRole('option', { name: 'Instalación mecánica' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Desarme especializado' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Diagnóstico electrónico' })).not.toBeInTheDocument();
  });
});
