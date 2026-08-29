// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CustomerFormModal } from '../../../src/features/customers/CustomerFormModal';
import { renderWithProviders } from '../../support/render';
import '../../support/dom';

describe('CustomerFormModal', () => {
  it('collects all fields for a new customer', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(
      <CustomerFormModal
        open
        customer={null}
        isSaving={false}
        error={null}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText('Nombre'), 'Flota Este');
    await user.type(screen.getByLabelText('RNC / Cédula'), '131000001');
    await user.type(screen.getByLabelText('Teléfono'), '809-555-0100');
    await user.type(screen.getByLabelText('Correo'), 'flota@example.com');
    await user.type(screen.getByLabelText('Dirección'), 'Santo Domingo');
    await user.type(screen.getByLabelText('Notas'), 'Cliente nuevo');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onSubmit).toHaveBeenCalledWith({
      id: undefined,
      name: 'Flota Este',
      rnc: '131000001',
      phone: '809-555-0100',
      email: 'flota@example.com',
      address: 'Santo Domingo',
      notes: 'Cliente nuevo',
    });
  });

  it('prefills an edit and displays save errors inside the dialog', () => {
    renderWithProviders(
      <CustomerFormModal
        open
        customer={{ id: 'C1', name: 'Transportes del Caribe' }}
        isSaving={false}
        error="El RNC ya existe"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Editar cliente' })).toBeVisible();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Transportes del Caribe');
    expect(screen.getByText('El RNC ya existe')).toBeVisible();
  });
});
