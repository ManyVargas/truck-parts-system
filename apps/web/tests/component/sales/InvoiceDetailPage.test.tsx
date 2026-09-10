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
    const backToSales = screen.getByRole('link', { name: 'Volver a Ventas y Facturas' });
    expect(backToSales).toHaveAttribute('href', '/sales');
    expect(backToSales).toHaveTextContent('');
    expect(screen.queryByText('Volver al listado')).not.toBeInTheDocument();
    expect(screen.getByText('Sin pagar')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Cancelar factura' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Corregir moneda' })).not.toBeInTheDocument();
    expect(screen.queryByText('Rentabilidad')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Registrar pago' }));
    await user.type(screen.getByLabelText('Monto'), '5000');
    await user.click(screen.getByRole('button', { name: 'Confirmar pago' }));

    expect(await screen.findByText('Pago parcial')).toBeVisible();
    expect(screen.getAllByText(/por Laura Pérez/).length).toBeGreaterThan(0);
  });

  it('shows ITBIS breakdown for fiscal invoices', async () => {
    signInAs('ADMINISTRATOR');
    renderWithProviders(detailRoute(), {
      route: '/sales/INV-098',
      auth: createAuthValue('ADMINISTRATOR'),
    });

    expect(await screen.findByRole('heading', { name: 'FAC-000098' })).toBeVisible();
    expect(screen.getByText(/2,974\.58/)).toBeVisible();
    expect(screen.getByText('Rentabilidad')).toBeVisible();
  });

  it('shows ITBIS as zero on a non-fiscal invoice PDF preview', async () => {
    signInAs('SELLER');
    const user = userEvent.setup();
    renderWithProviders(detailRoute(), {
      route: '/sales/INV-099',
      auth: createAuthValue('SELLER'),
    });

    expect(await screen.findByRole('heading', { name: 'FAC-000099' })).toBeVisible();
    expect(screen.queryByText('Precio final')).not.toBeInTheDocument();
    expect(screen.getAllByText('RD$0.00').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Vista previa del documento' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('NCF: ______________________')).toBeVisible();
    expect(within(dialog).getByText('ITBIS incluido')).toBeVisible();
    expect(within(dialog).getAllByText('RD$0.00').length).toBeGreaterThan(0);
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
    const cancelDialog = await screen.findByRole('dialog', { name: 'Cancelar factura' });
    await user.type(within(cancelDialog).getByLabelText('Motivo'), 'Cliente desistió');
    await user.click(within(cancelDialog).getByRole('button', { name: 'Cancelar factura' }));

    const confirmDialog = await screen.findByRole('dialog', { name: 'Confirmar cancelación' });
    expect(within(confirmDialog).getByText(/quedará cancelada/i)).toBeVisible();
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar cancelación' }));

    expect(await screen.findByText('Cancelada')).toBeVisible();
    expect(screen.getAllByText('Cancelada')).toHaveLength(1);
    expect(screen.getByText('Cliente desistió')).toBeVisible();
  });

  it('does not cancel when the administrator backs out of confirmation', async () => {
    signInAs('ADMINISTRATOR');
    const user = userEvent.setup();
    renderWithProviders(detailRoute(), {
      route: '/sales/INV-097',
      auth: createAuthValue('ADMINISTRATOR'),
    });

    expect(await screen.findByRole('heading', { name: 'FAC-000097' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cancelar factura' }));
    const cancelDialog = await screen.findByRole('dialog', { name: 'Cancelar factura' });
    await user.type(within(cancelDialog).getByLabelText('Motivo'), 'Cliente desistió');
    await user.click(within(cancelDialog).getByRole('button', { name: 'Cancelar factura' }));

    const confirmDialog = await screen.findByRole('dialog', { name: 'Confirmar cancelación' });
    await user.click(within(confirmDialog).getByRole('button', { name: 'Volver' }));

    expect(await screen.findByRole('dialog', { name: 'Cancelar factura' })).toBeVisible();
    expect(screen.queryByText('Cancelada')).not.toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByLabelText('Motivo')).toHaveValue(
      'Cliente desistió',
    );
  });
});
