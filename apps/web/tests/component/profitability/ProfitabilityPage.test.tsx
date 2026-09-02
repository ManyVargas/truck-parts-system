// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProfitabilityPage } from '../../../src/features/profitability/ProfitabilityPage';
import { resetMockState } from '../../../src/mocks/state';
import { money } from '../../../src/shared/ui';
import { renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

describe('ProfitabilityPage', () => {
  beforeEach(() => {
    resetMockState();
    signInAs('ADMINISTRATOR');
  });

  afterEach(() => {
    resetMockState();
  });

  it('keeps FAC-000096 pending until FX is enabled and retried', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfitabilityPage />, { route: '/profitability' });

    expect(await screen.findByText('FAC-000096')).toBeVisible();
    expect(screen.getByText('Ganancia bruta en pesos')).toBeVisible();
    expect(screen.queryByText('Ganancia bruta en dólares')).not.toBeInTheDocument();
    expect(screen.getAllByText('Pendiente de tasa de cambio').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Activar tasa de cambio (demo)' }));
    expect(await screen.findByText('Tasa de cambio activada. Reintente las facturas pendientes.')).toBeVisible();

    const retryButtons = screen.getAllByRole('button', { name: 'Reintentar' });
    await user.click(retryButtons[0]);
    expect(await screen.findByText('Cálculo de rentabilidad reintentado')).toBeVisible();
    expect(screen.queryByText('Pendiente de tasa de cambio')).not.toBeInTheDocument();

    const profitUsd = Math.round((1_200 - 42_000 / 61.5 + Number.EPSILON) * 100) / 100;
    const profitDop = Math.round((profitUsd * 61.5 + Number.EPSILON) * 100) / 100;
    expect(screen.getAllByText(money(profitDop, 'DOP')).length).toBeGreaterThan(0);
    expect(screen.getByText(money(8_900 + profitDop, 'DOP'))).toBeVisible();
  });

  it('lets an administrator record gross profit when the invoice shows unavailable', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfitabilityPage />, { route: '/profitability' });

    expect(await screen.findByText('FAC-000097')).toBeVisible();
    expect(screen.getByText('No disponible')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Registrar ganancia' }));
    await user.type(screen.getByLabelText('Ganancia bruta en pesos'), '1800');
    await user.click(screen.getByRole('button', { name: 'Guardar ganancia' }));

    expect(await screen.findByText('Ganancia bruta registrada')).toBeVisible();
    expect(screen.getByText(money(1_800, 'DOP'))).toBeVisible();
    expect(screen.getByText(money(8_900 + 1_800, 'DOP'))).toBeVisible();
    expect(screen.getByText('criterio admin')).toBeVisible();
    expect(screen.queryByText('No disponible')).not.toBeInTheDocument();
  });
});
