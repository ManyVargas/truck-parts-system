// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { PosPage } from '../../../src/features/sales/PosPage';
import { CAPABILITY_PRESETS, type AppCapabilities } from '../../../src/shared/config/capabilities';
import { mockCustomerRepository } from '../../../src/mocks/repositories/MockCustomerRepository';
import { mockSalesRepository } from '../../../src/mocks/repositories/MockSalesRepository';
import { reloadMockStateFromStorage, resetMockState } from '../../../src/mocks/state';
import { renderWithProviders } from '../../support/render';
import { signInAs } from '../../support/session';
import '../../support/dom';

function renderPos(draftId = 'INV-DRAFT-01', capabilities?: AppCapabilities) {
  return renderWithProviders(
    <Routes>
      <Route path="/sales/draft/:id" element={<PosPage />} />
    </Routes>,
    { route: `/sales/draft/${draftId}`, capabilities },
  );
}

const originalMatchMedia = window.matchMedia;

function stubViewportWidth(width: number) {
  window.matchMedia = ((query: string) => {
    const minWidth = Number(/min-width:\s*(\d+)/.exec(query)?.[1] ?? 0);
    return {
      matches: width >= minWidth,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }) as typeof window.matchMedia;
}

describe('PosPage', () => {
  beforeEach(() => {
    resetMockState();
    signInAs('SELLER');
  });

  afterEach(() => {
    resetMockState();
    window.matchMedia = originalMatchMedia;
  });

  it('loads the seed draft with nonfiscal ITBIS at zero', async () => {
    renderPos();

    expect(await screen.findByText('Alternador 24V')).toBeVisible();
    expect(screen.getByText('Aceite 15W-40 Galón')).toBeVisible();
    expect(screen.getByTestId('pos-itbis')).toHaveTextContent('RD$0.00');
    expect(screen.getByText('Transportes del Caribe SRL', { exact: false })).toBeVisible();

    const addLine = screen.getByRole('button', { name: 'Agregar línea' });
    const discardDraft = screen.getByRole('button', { name: 'Descartar borrador' });
    const confirmSale = screen.getByRole('button', { name: 'Confirmar venta' });
    expect(addLine.className).toEqual(expect.stringContaining('text-sm'));
    expect(discardDraft.className).toEqual(expect.stringContaining('text-sm'));
    expect(addLine.className).toEqual(expect.stringContaining('min-h-11'));
    expect(discardDraft.className).toEqual(expect.stringContaining('min-h-11'));
    expect(confirmSale.className).toEqual(expect.stringContaining('text-base'));
    expect(confirmSale.className).toEqual(expect.stringContaining('min-h-12'));
    expect(discardDraft.className).toEqual(expect.stringContaining('bg-transparent'));
    expect(confirmSale.className).toEqual(expect.stringContaining('bg-brand'));
    expect(screen.getByTestId('pos-total')).toBeVisible();
  });

  it('discards a draft with lines via undo toast instead of a confirm dialog', async () => {
    const user = userEvent.setup();
    renderPos();
    await screen.findByText('Alternador 24V');

    await user.click(screen.getByRole('button', { name: 'Descartar borrador' }));

    expect(screen.queryByRole('dialog', { name: 'Descartar borrador' })).not.toBeInTheDocument();
    expect(await screen.findByText('Borrador descartado.')).toBeVisible();
    expect(screen.queryByText('Alternador 24V')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));

    expect(await screen.findByText('Alternador 24V')).toBeVisible();
    expect(screen.getByText('Aceite 15W-40 Galón')).toBeVisible();
  });

  it('hides inventory line types and reservation copy in Release 2', async () => {
    const user = userEvent.setup();
    renderPos('INV-DRAFT-01', CAPABILITY_PRESETS['release-2']);
    await screen.findByText('Alternador 24V');

    expect(
      screen.getByText('Edite el borrador, asigne precios y confirme la factura.'),
    ).toBeVisible();
    expect(
      screen.queryByText(/Las piezas de inventario quedan reservadas/),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Agregar línea' }));
    const type = screen.getByLabelText('Tipo de línea');
    expect(type).not.toHaveTextContent('Artículo de inventario');
    expect(type).not.toHaveTextContent('Producto por cantidad');
    expect(type).toHaveTextContent('Mercancía genérica');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar venta' }));
    expect(screen.queryByLabelText('Pago inicial')).not.toBeInTheDocument();
    expect(screen.queryByText(/orden de desarme pendiente/i)).not.toBeInTheDocument();
  });

  it('recalculates included ITBIS when fiscal mode is enabled', async () => {
    const user = userEvent.setup();
    renderPos();
    await screen.findByText('Alternador 24V');

    await user.click(screen.getByLabelText(/Factura con comprobante fiscal/));

    expect(await screen.findByTestId('pos-itbis')).not.toHaveTextContent('RD$0.00');
  });

  it('confirms the seed draft and shows the assigned FAC number', async () => {
    const user = userEvent.setup();
    renderPos();
    await screen.findByText('Alternador 24V');

    await user.click(screen.getByRole('button', { name: 'Confirmar venta' }));
    const confirmButtons = screen.getAllByRole('button', { name: 'Confirmar venta' });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(await screen.findByText('Venta confirmada')).toBeVisible();
    expect(screen.getByText(/Orden de desarme: OD-DEMO-064/)).toBeVisible();
  });

  it('lists a newly created customer in the selector', async () => {
    await mockCustomerRepository.save({ name: 'Flota Este', rnc: '1-23-45678-9' });

    renderPos();

    expect(await screen.findByRole('option', { name: /Flota Este/ })).toBeVisible();
  });

  it('does not offer inactive seed services when adding a line', async () => {
    const user = userEvent.setup();
    renderPos();
    await screen.findByText('Alternador 24V');

    await user.click(screen.getByRole('button', { name: 'Agregar línea' }));
    await user.selectOptions(screen.getByLabelText('Tipo de línea'), 'SERVICE');

    expect(screen.getByRole('option', { name: 'Instalación mecánica' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Desarme especializado' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Diagnóstico electrónico' })).not.toBeInTheDocument();
  });

  it('keeps an open draft after a simulated page reload', async () => {
    const created = await mockSalesRepository.createDraft();
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    await Promise.resolve();
    reloadMockStateFromStorage();
    renderPos(created.value.draftId);

    expect(await screen.findByRole('heading', { name: 'Punto de venta' })).toBeVisible();
    expect(screen.queryByText('Borrador no encontrado')).not.toBeInTheDocument();
  });

  it('explains a blocked confirm and jumps to the first missing requirement', async () => {
    const created = await mockSalesRepository.createDraft();
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const user = userEvent.setup();
    renderPos(created.value.draftId);

    expect(await screen.findByRole('button', { name: 'Confirmar venta' })).toBeDisabled();
    expect(screen.getByText('Agregue al menos una línea', { selector: '#pos-confirm-block-reason' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Ver requisitos' }));
    expect(document.getElementById('pos-lines')).toHaveFocus();
  });

  it('jumps Ver requisitos to the first pending price', async () => {
    const created = await mockSalesRepository.createDraft();
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    await mockSalesRepository.addLine({
      draftId: created.value.draftId,
      type: 'ITEM',
      itemId: 'ALT-010',
    });

    const user = userEvent.setup();
    renderPos(created.value.draftId);

    expect(await screen.findByText('Hay precios pendientes', { selector: '#pos-confirm-block-reason' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Ver requisitos' }));
    expect(document.activeElement).toHaveAttribute('aria-label', expect.stringMatching(/^Precio de /));
  });

  it('removes a line immediately and restores it from the undo toast', async () => {
    const user = userEvent.setup();
    renderPos();
    await screen.findByText('Alternador 24V');

    await user.click(screen.getAllByRole('button', { name: 'Quitar' })[0]!);

    expect(await screen.findByText('Producto eliminado.')).toBeVisible();
    expect(screen.queryByText('Alternador 24V')).not.toBeInTheDocument();
    expect(screen.getByText('Aceite 15W-40 Galón')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));

    expect(await screen.findByText('Alternador 24V')).toBeVisible();
    expect(screen.queryByText('Precio pendiente')).not.toBeInTheDocument();
  });

  it('renders line cards below the lg breakpoint', async () => {
    stubViewportWidth(768);
    renderPos();

    expect(await screen.findByText('Alternador 24V')).toBeVisible();
    expect(screen.queryByRole('columnheader', { name: 'Descripción' })).not.toBeInTheDocument();
    expect(screen.getByText('Artículo · ALT-004')).toBeVisible();
    expect(screen.getAllByText('Cantidad')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Quitar' })).toHaveLength(2);
  });
});
