// @vitest-environment jsdom

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InvoiceDetailPage } from '../../../src/features/sales/InvoiceDetailPage';
import { resetMockState } from '../../../src/mocks/state';
import { createAuthValue, renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

function detailRoute() {
  return (
    <Routes>
      <Route path="/sales/:id" element={<InvoiceDetailPage />} />
      <Route path="/sales/draft/:id" element={<p>POS placeholder</p>} />
    </Routes>
  );
}

describe('InvoiceDetailPage', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  it('lets a seller record a payment and updates the chip', async () => {
    signInAs('SELLER');
    const user = userEvent.setup();
    renderWithProviders(detailRoute(), {
      route: '/sales/INV-098',
      auth: createAuthValue('SELLER'),
    });

    expect(await screen.findByRole('heading', { name: 'FAC-000098' })).toBeVisible();
    expect(screen.getByText('Sin pagar')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Cancelar factura' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Corregir moneda' })).not.toBeInTheDocument();
    expect(screen.queryByText('Rentabilidad')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Registrar pago' }));
    await user.type(screen.getByLabelText('Monto'), '5000');
    await user.click(screen.getByRole('button', { name: 'Confirmar pago' }));

    expect(await screen.findByText('Parcial')).toBeVisible();
  });

  it('shows ITBIS breakdown for fiscal invoices and em dash for non-fiscal', async () => {
    signInAs('ADMINISTRATOR');
    renderWithProviders(detailRoute(), {
      route: '/sales/INV-098',
      auth: createAuthValue('ADMINISTRATOR'),
    });

    expect(await screen.findByRole('heading', { name: 'FAC-000098' })).toBeVisible();
    expect(screen.getByText(/2,974\.58/)).toBeVisible();
    expect(screen.getByText('Rentabilidad')).toBeVisible();
  });

  it('shows an em dash instead of ITBIS on a non-fiscal invoice PDF preview', async () => {
    signInAs('SELLER');
    const user = userEvent.setup();
    renderWithProviders(detailRoute(), {
      route: '/sales/INV-099',
      auth: createAuthValue('SELLER'),
    });

    expect(await screen.findByRole('heading', { name: 'FAC-000099' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Vista previa PDF' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('NCF: ______________________')).toBeVisible();
    expect(within(dialog).getAllByText('—').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('RD$0.00')).toBeVisible();
  });

  it('lets an administrator cancel with a reason', async () => {
    signInAs('ADMINISTRATOR');
    const user = userEvent.setup();
    renderWithProviders(detailRoute(), {
      route: '/sales/INV-097',
      auth: createAuthValue('ADMINISTRATOR'),
    });

    expect(await screen.findByRole('heading', { name: 'FAC-000097' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cancelar factura' }));
    await user.type(screen.getByLabelText('Motivo'), 'Cliente desistió');
    await user.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));

    expect(await screen.findByText('Cancelada')).toBeVisible();
    expect(screen.getByText('Cliente desistió')).toBeVisible();
  });
});
