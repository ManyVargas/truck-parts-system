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
    expect(partialRow && within(partialRow).getByText('Parcial')).toBeTruthy();
  });

  it('filters drafts in the Borrador tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SalesPage />, { route: '/sales', auth: createAuthValue('SELLER') });
    await screen.findByText('FAC-000098');

    await user.click(screen.getByRole('tab', { name: 'Borrador' }));

    expect(await screen.findByText(/Borrador INV-DRAFT-01/)).toBeVisible();
    expect(screen.queryByText('FAC-000098')).not.toBeInTheDocument();
  });
});
