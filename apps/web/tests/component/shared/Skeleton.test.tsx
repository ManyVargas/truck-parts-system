// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from '../../../src/shared/ui';
import { renderWithProviders } from '../../support/render';
import '../../support/dom';

describe('Skeleton', () => {
  it('announces loading in a polite live region', () => {
    renderWithProviders(<Skeleton label="Cargando inventario" />);

    const status = screen.getByRole('status', { name: 'Cargando inventario' });
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});
