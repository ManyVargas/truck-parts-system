// @vitest-environment jsdom

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ItemAdminActions } from '../../../src/features/inventory/ItemAdminActions';
import { createInitialState } from '../../../src/mocks/data/seed';
import { buildItemDetail } from '../../../src/mocks/services/inventory-catalog';
import { renderWithProviders } from '../../support/render';
import '../../support/dom';

function handlers() {
  return {
    onSetNoDesarmar: vi.fn().mockResolvedValue(null),
    onCorrectCost: vi.fn().mockResolvedValue(null),
    onCorrectBaseline: vi.fn().mockResolvedValue(null),
    onCreateWorkOrder: vi.fn().mockResolvedValue(null),
  };
}

describe('ItemAdminActions', () => {
  it('shows baseline validation failures inside the active modal', async () => {
    const user = userEvent.setup();
    const detail = buildItemDetail(createInitialState(), 'ENG-002')!;
    const callbacks = handlers();
    callbacks.onCorrectBaseline.mockResolvedValue('Seleccione al menos un faltante');
    renderWithProviders(<ItemAdminActions detail={detail} isMutating={false} {...callbacks} />);

    await user.click(screen.getByRole('button', { name: 'Corregir baseline' }));
    const dialog = screen.getByRole('dialog', { name: 'Corregir baseline de recepción' });
    await user.type(within(dialog).getByLabelText('Motivo'), 'Corrección verificada');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar corrección' }));

    expect(await within(dialog).findByText('Seleccione al menos un faltante')).toBeVisible();
  });

  it('submits null when the administrator clears cost provenance', async () => {
    const user = userEvent.setup();
    const detail = buildItemDetail(createInitialState(), 'FLT-001')!;
    detail.costProvenance = 'Factura original';
    const callbacks = handlers();
    renderWithProviders(<ItemAdminActions detail={detail} isMutating={false} {...callbacks} />);

    await user.click(screen.getByRole('button', { name: 'Corregir costo' }));
    const dialog = screen.getByRole('dialog', { name: 'Corregir costo de adquisición' });
    await user.clear(within(dialog).getByLabelText('Procedencia'));
    await user.type(within(dialog).getByLabelText('Motivo'), 'Procedencia incorrecta');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar corrección' }));

    expect(callbacks.onCorrectCost).toHaveBeenCalledWith(
      expect.objectContaining({
        costProvenance: null,
        reason: 'Procedencia incorrecta',
      }),
    );
  });

  it('does not offer No desarmar for a unique part', () => {
    const detail = buildItemDetail(createInitialState(), 'FLT-001')!;

    renderWithProviders(<ItemAdminActions detail={detail} isMutating={false} {...handlers()} />);

    expect(screen.queryByRole('button', { name: /No desarmar/ })).not.toBeInTheDocument();
  });
});
