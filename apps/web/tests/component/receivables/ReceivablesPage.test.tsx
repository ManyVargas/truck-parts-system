// @vitest-environment jsdom

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ReceivablesPage } from '../../../src/features/receivables/ReceivablesPage';
import { getMockState, resetMockState } from '../../../src/mocks/state';
import { createAuthValue, renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

function openUsdReceivableForSecondCustomer() {
  const invoice = getMockState().invoices.find((entry) => entry.id === 'INV-096');
  if (invoice) {
    invoice.paymentState = 'UNPAID';
  }
}

describe('ReceivablesPage', () => {
  beforeEach(() => {
    resetMockState();
    signInAs('SELLER');
    openUsdReceivableForSecondCustomer();
  });

  afterEach(() => {
    resetMockState();
  });

  it('filters customer summary and open invoices by customer name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReceivablesPage />, {
      route: '/receivables',
      auth: createAuthValue('SELLER'),
    });

    expect(await screen.findByText('FAC-000098')).toBeVisible();
    expect(screen.getByText('FAC-000096')).toBeVisible();
    expect(screen.getAllByText('Transportes del Caribe SRL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Logística Norte SA').length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText('Filtrar por nombre del cliente'), 'caribe');

    expect(screen.getByText('FAC-000098')).toBeVisible();
    expect(screen.queryByText('FAC-000096')).not.toBeInTheDocument();

    const summary = screen.getByRole('heading', { name: 'Resumen por cliente' }).closest('section');
    expect(summary).not.toBeNull();
    expect(within(summary!).getByText('Transportes del Caribe SRL')).toBeVisible();
    expect(within(summary!).queryByText('Logística Norte SA')).not.toBeInTheDocument();
  });

  it('shows an empty state when no customer name matches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReceivablesPage />, {
      route: '/receivables',
      auth: createAuthValue('SELLER'),
    });
    await screen.findByText('FAC-000098');

    await user.type(screen.getByLabelText('Filtrar por nombre del cliente'), 'cliente inexistente');

    expect(screen.getAllByText('Sin resultados').length).toBeGreaterThan(0);
    expect(screen.queryByText('FAC-000098')).not.toBeInTheDocument();
  });
});
