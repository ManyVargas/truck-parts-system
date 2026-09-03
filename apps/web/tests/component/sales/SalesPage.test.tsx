// @vitest-environment jsdom

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SalesPage } from '../../../src/features/sales/SalesPage';
import { resetMockState } from '../../../src/mocks/state';
import { createAuthValue, renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

describe('SalesPage', () => {
  beforeEach(() => {
    resetMockState();
    signInAs('SELLER');
  });

  afterEach(() => {
    resetMockState();
  });

  it('shows unpaid and partially paid seed invoices', async () => {
    renderWithProviders(<SalesPage />, { route: '/sales', auth: createAuthValue('SELLER') });

    expect(await screen.findByText('FAC-000098')).toBeVisible();
    expect(screen.getByText('FAC-000099')).toBeVisible();

    const unpaidRow = screen.getByText('FAC-000098').closest('tr');
    const partialRow = screen.getByText('FAC-000099').closest('tr');
    expect(unpaidRow && within(unpaidRow).getByText('Sin pagar')).toBeTruthy();
    expect(partialRow && within(partialRow).getByText('Pago parcial')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'FAC-000098' })).toHaveAttribute(
      'href',
      '/sales/INV-098',
    );
    expect(unpaidRow).toHaveClass('cursor-pointer');
  });

  it('filters drafts in the Borrador tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SalesPage />, { route: '/sales', auth: createAuthValue('SELLER') });
    await screen.findByText('FAC-000098');

    await user.click(screen.getByRole('button', { name: 'Borrador' }));

    expect(await screen.findByText(/Borrador INV-DRAFT-01/)).toBeVisible();
    expect(screen.queryByText('FAC-000098')).not.toBeInTheDocument();
  });

  it('offers a new-draft action that stays available after listing', async () => {
    renderWithProviders(<SalesPage />, { route: '/sales', auth: createAuthValue('SELLER') });
    await screen.findByText('FAC-000098');
    expect(screen.getByRole('button', { name: 'Nuevo borrador' })).toBeVisible();
  });

  it('filters the list by invoice number so a previous sale can be found', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SalesPage />, { route: '/sales', auth: createAuthValue('SELLER') });
    await screen.findByText('FAC-000098');

    await user.type(screen.getByLabelText('Buscar por número o cliente'), 'FAC-000099');

    expect(screen.getByText('FAC-000099')).toBeVisible();
    expect(screen.queryByText('FAC-000098')).not.toBeInTheDocument();
  });

  it('opens the draft tab from the tab query param', async () => {
    renderWithProviders(<SalesPage />, {
      route: '/sales?tab=DRAFT',
      auth: createAuthValue('SELLER'),
    });

    expect(await screen.findByText(/Borrador INV-DRAFT-01/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Borrador' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('FAC-000098')).not.toBeInTheDocument();
  });

  it('hides zero-balance invoices when outstanding=1', async () => {
    renderWithProviders(<SalesPage />, {
      route: '/sales?outstanding=1',
      auth: createAuthValue('SELLER'),
    });

    expect(await screen.findByText('FAC-000098')).toBeVisible();
    expect(screen.getByText('FAC-000099')).toBeVisible();
    expect(screen.getByText('Saldo pendiente')).toBeVisible();
    expect(screen.queryByText('FAC-000097')).not.toBeInTheDocument();
    expect(screen.queryByText('FAC-000096')).not.toBeInTheDocument();
  });

  it('keeps only invoices confirmed on the demo day when today=1', async () => {
    renderWithProviders(<SalesPage />, {
      route: '/sales?today=1',
      auth: createAuthValue('SELLER'),
    });

    expect(await screen.findByText('FAC-000098')).toBeVisible();
    expect(screen.getByText('FAC-000099')).toBeVisible();
    expect(screen.getByText('Facturas de hoy')).toBeVisible();
    expect(screen.queryByText('FAC-000096')).not.toBeInTheDocument();
    expect(screen.queryByText('FAC-000097')).not.toBeInTheDocument();
  });

  it('shows the payment history when payments=1', async () => {
    renderWithProviders(<SalesPage />, {
      route: '/sales?payments=1',
      auth: createAuthValue('SELLER'),
    });

    expect(await screen.findByText('FAC-000099')).toBeVisible();
    expect(screen.getByText('FAC-000097')).toBeVisible();
    expect(screen.getByText('FAC-000096')).toBeVisible();
    expect(screen.getByText('Historial de cobros')).toBeVisible();
    expect(screen.queryByText('FAC-000098')).not.toBeInTheDocument();
  });
});
