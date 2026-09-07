// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { MechanicLayout } from '../../../src/features/mechanic/MechanicLayout';
import { APP_NAME } from '../../../src/shared/config/brand';
import { createAuthValue, renderWithProviders } from '../../support/render';
import '../../support/dom';

describe('MechanicLayout', () => {
  it('shows the company logo and name in the header', () => {
    renderWithProviders(
      <Routes>
        <Route path="/mechanic" element={<MechanicLayout />}>
          <Route index element={<p>Cola</p>} />
        </Route>
      </Routes>,
      { route: '/mechanic', auth: createAuthValue('MECHANIC') },
    );

    expect(screen.getByText(APP_NAME)).toBeVisible();
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    expect(screen.queryByText('App Mecánico')).not.toBeInTheDocument();
    expect(screen.queryByText('MECHANIC', { selector: 'header p' })).not.toBeInTheDocument();
  });
});
