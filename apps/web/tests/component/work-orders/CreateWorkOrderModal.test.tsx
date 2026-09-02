// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CreateWorkOrderModal } from '../../../src/features/work-orders/CreateWorkOrderModal';
import { renderWithProviders } from '../../support/render';
import '../../support/dom';

const OPTIONS = {
  dismantlingPieces: [{ id: 'ENG-001', name: 'Detroit DD15 Completo', parentId: 'TRK-001' }],
  installationPieces: [{ id: 'ALT-010', name: 'Alternador independiente' }],
  destinations: [{ id: 'ENG-002', name: 'Motor incompleto' }],
  mechanics: [{ id: 'U-PEDRO', name: 'Pedro Santana' }],
};

describe('CreateWorkOrderModal', () => {
  it('submits a dismantling selection', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(
      <CreateWorkOrderModal
        open
        options={OPTIONS}
        isSaving={false}
        error={null}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Pieza'), 'ENG-001');
    await user.type(screen.getByLabelText('Notas'), 'Desarme de patio');
    await user.click(screen.getByRole('button', { name: 'Crear orden de trabajo' }));

    expect(onSubmit).toHaveBeenCalledWith({
      pieceId: 'ENG-001',
      type: 'DISMANTLING',
      destinationParentId: undefined,
      notes: 'Desarme de patio',
    });
  });

  it('requires a destination when creating an installation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(
      <CreateWorkOrderModal
        open
        options={OPTIONS}
        isSaving={false}
        error={null}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Tipo'), 'INSTALLATION');
    await user.selectOptions(screen.getByLabelText('Pieza'), 'ALT-010');
    await user.selectOptions(screen.getByLabelText('Padre destino'), 'ENG-002');
    await user.click(screen.getByRole('button', { name: 'Crear orden de trabajo' }));

    expect(onSubmit).toHaveBeenCalledWith({
      pieceId: 'ALT-010',
      type: 'INSTALLATION',
      destinationParentId: 'ENG-002',
      notes: undefined,
    });
  });
});
