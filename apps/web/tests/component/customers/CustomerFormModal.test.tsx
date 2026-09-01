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
    await user.type(screen.getByLabelText('Dirección'), 'Santo Domingo');
    await user.type(screen.getByLabelText('Notas'), 'Cliente nuevo');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onSubmit).toHaveBeenCalledWith({
      id: undefined,
      name: 'Flota Este',
      rnc: '131000001',
      address: 'Santo Domingo',
      notes: 'Cliente nuevo',
      contacts: [],
    });
  });

  it('submits two contacts from the dynamic list', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Agregar contacto' }));
    await user.click(screen.getByRole('button', { name: 'Agregar contacto' }));

    const names = screen.getAllByLabelText('Nombre del contacto');
    const phones = screen.getAllByLabelText('Teléfono');
    const emails = screen.getAllByLabelText('Correo');
    const titles = screen.getAllByLabelText('Cargo');

    await user.type(names[0]!, 'María Reyes');
    await user.type(phones[0]!, '809-555-0100');
    await user.type(emails[0]!, 'maria@example.com');
    await user.type(titles[0]!, 'Compras');
    await user.type(names[1]!, 'Carlos Peña');
    await user.type(phones[1]!, '809-555-0101');

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onSubmit).toHaveBeenCalledWith({
      id: undefined,
      name: 'Flota Este',
      rnc: '',
      address: '',
      notes: '',
      contacts: [
        {
          id: undefined,
          name: 'María Reyes',
          phone: '809-555-0100',
          email: 'maria@example.com',
          title: 'Compras',
          isPrimary: true,
        },
        {
          id: undefined,
          name: 'Carlos Peña',
          phone: '809-555-0101',
          email: '',
          title: '',
          isPrimary: undefined,
        },
      ],
    });
  });

  it('prefills an edit and displays save errors inside the dialog', () => {
    renderWithProviders(
      <CustomerFormModal
        open
        customer={{ id: 'C1', name: 'Transportes del Caribe', contacts: [] }}
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
