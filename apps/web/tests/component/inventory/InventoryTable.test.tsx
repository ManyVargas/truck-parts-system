// @vitest-environment jsdom

import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { InventoryListRow } from '../../../src/api/contracts/inventory';
import { InventoryTable } from '../../../src/features/inventory/InventoryTable';
import { UX_TERMS } from '../../../src/shared/copy/glossary';
import { renderWithProviders } from '../../support/render';
import '../../support/dom';

function listRow(overrides: Partial<InventoryListRow> = {}): InventoryListRow {
  return {
    kind: 'ITEM',
    id: 'ALT-001',
    name: 'Alternador Bosch',
    categoryId: 'CAT-ALT',
    categoryName: 'Alternador',
    effectiveLocation: 'Patio A',
    commercialState: 'AVAILABLE',
    physicalRelationship: 'INDEPENDENT',
    reserved: false,
    noDesarmar: false,
    ...overrides,
  };
}

describe('InventoryTable', () => {
  it('uses the six operational columns instead of a fused Estado cell', () => {
    renderWithProviders(<InventoryTable rows={[listRow()]} />);

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual([
      'Pieza',
      'Categoría',
      'Ubicación',
      UX_TERMS.availability,
      UX_TERMS.relation,
      UX_TERMS.alerts,
    ]);
  });

  it('shows the glossary fallback when a row has no registered location', () => {
    renderWithProviders(
      <InventoryTable rows={[listRow({ id: 'ALT-010', effectiveLocation: undefined })]} />,
    );

    const row = screen.getByRole('row', { name: /Alternador Bosch/ });
    const cells = within(row).getAllByRole('cell');

    expect(cells[2]).toHaveTextContent(UX_TERMS.missingLocation);
    expect(within(row).queryByText('Pendiente')).not.toBeInTheDocument();
  });

  it('keeps availability, relation, and restriction alerts as separate facts', () => {
    renderWithProviders(
      <InventoryTable
        rows={[
          listRow({
            id: 'ALT-004',
            physicalRelationship: 'INSTALLED',
            parentName: 'Motor MOT-0021',
            reserved: true,
            reservedByDraftId: 'FAC-000098',
            noDesarmar: true,
            complete: false,
          }),
        ]}
      />,
    );

    const row = screen.getByRole('row', { name: /Alternador Bosch/ });
    const cells = within(row).getAllByRole('cell');

    expect(within(cells[0]).queryByText('Pieza')).not.toBeInTheDocument();
    expect(cells[3]).toHaveTextContent('Disponible');
    expect(cells[3]).not.toHaveTextContent('Reservado');
    expect(cells[4]).toHaveTextContent('Instalado en Motor MOT-0021');
    expect(cells[5]).toHaveTextContent('Reservado');
    expect(cells[5]).toHaveTextContent('No desarmar');
    expect(cells[5]).toHaveTextContent('Incompleto');
    expect(cells[5]).not.toHaveTextContent('Disponible');
  });

  it('labels quantity and assembly kinds without painting a redundant Pieza subtitle', () => {
    renderWithProviders(
      <InventoryTable
        rows={[
          listRow({
            id: 'QTY-001',
            kind: 'QTY',
            name: 'Aceite 15W-40 Galón',
            physicalRelationship: undefined,
            qtyAvailable: 8,
            qtyOnHand: 8,
          }),
          listRow({ id: 'MOT-002', name: 'Motor Detroit DD15', isAssembly: true }),
        ]}
      />,
    );

    const qtyRow = screen.getByRole('row', { name: /Aceite 15W-40 Galón/ });
    const assemblyRow = screen.getByRole('row', { name: /Motor Detroit DD15/ });
    const qtyCells = within(qtyRow).getAllByRole('cell');
    const assemblyCells = within(assemblyRow).getAllByRole('cell');

    expect(qtyCells[0]).toHaveTextContent(UX_TERMS.quantityItem);
    expect(qtyCells[3]).toHaveTextContent('8 disponibles / 8 en existencia');
    expect(qtyCells[4]).toHaveTextContent(UX_TERMS.quantityItem);
    expect(assemblyCells[0]).toHaveTextContent(UX_TERMS.assembly);
    expect(assemblyCells[4]).toHaveTextContent('Independiente');
  });
});
