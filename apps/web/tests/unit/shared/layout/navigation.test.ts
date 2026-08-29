import { describe, expect, it } from 'vitest';

import {
  defaultPathForRole,
  isKnownDesktopRoute,
  isKnownMechanicRoute,
  isNavItemActive,
  isRouteAllowedForRole,
  layoutAccessDecision,
  navItemsForRole,
} from '../../../../src/shared/layout/navigation';

describe('role navigation', () => {
  it('shows nine desktop entries to administrators and four to sellers', () => {
    expect(navItemsForRole('ADMINISTRATOR')).toHaveLength(9);
    expect(navItemsForRole('SELLER').map((item) => item.id)).toEqual([
      'dashboard',
      'inventory',
      'sales',
      'customers',
    ]);
    expect(navItemsForRole('MECHANIC')).toEqual([]);
  });

  it('maps every role to its correct home', () => {
    expect(defaultPathForRole('ADMINISTRATOR')).toBe('/dashboard');
    expect(defaultPathForRole('SELLER')).toBe('/dashboard');
    expect(defaultPathForRole('MECHANIC')).toBe('/mechanic');
  });

  it('recognizes registered route patterns and rejects typos', () => {
    expect(isKnownDesktopRoute('/inventory/ENG-001')).toBe(true);
    expect(isKnownDesktopRoute('/sales/draft/INV-DRAFT-01')).toBe(true);
    expect(isKnownDesktopRoute('/invenray')).toBe(false);
    expect(isKnownMechanicRoute('/mechanic/pending')).toBe(true);
    expect(isKnownMechanicRoute('/mechanic/nope')).toBe(false);
  });

  it('activates only the matching known navigation section', () => {
    expect(isNavItemActive('/inventory/ENG-001', '/inventory')).toBe(true);
    expect(isNavItemActive('/sales/draft/INV-DRAFT-01', '/sales')).toBe(true);
    expect(isNavItemActive('/inventory/ENG-001', '/sales')).toBe(false);
    expect(isNavItemActive('/inventory/nope/extra', '/inventory')).toBe(false);
  });

  it('enforces administrator-only desktop sections', () => {
    expect(isRouteAllowedForRole('/customers', 'SELLER')).toBe(true);
    expect(isRouteAllowedForRole('/users', 'SELLER')).toBe(false);
    expect(isRouteAllowedForRole('/profitability', 'ADMINISTRATOR')).toBe(true);
  });
});

const DESKTOP_ROLES = ['ADMINISTRATOR', 'SELLER'] as const;
const MECHANIC_ROLES = ['MECHANIC'] as const;

describe('layoutAccessDecision', () => {
  it('allows a seller into the desktop shell', () => {
    expect(layoutAccessDecision('/inventory', 'SELLER', [...DESKTOP_ROLES])).toBe('allow');
  });

  it('forbids a mechanic from a real desktop screen', () => {
    expect(layoutAccessDecision('/inventory', 'MECHANIC', [...DESKTOP_ROLES])).toBe('forbidden');
  });

  it('returns 404 for a mechanic typo that is not a registered route', () => {
    expect(layoutAccessDecision('/invenray', 'MECHANIC', [...DESKTOP_ROLES])).toBe('not_found');
  });

  it('forbids an administrator from the mechanic app', () => {
    expect(layoutAccessDecision('/mechanic/pending', 'ADMINISTRATOR', [...MECHANIC_ROLES])).toBe(
      'forbidden',
    );
  });

  it('returns 404 for an unknown mechanic subpath', () => {
    expect(layoutAccessDecision('/mechanic/nope', 'ADMINISTRATOR', [...MECHANIC_ROLES])).toBe(
      'not_found',
    );
  });
});
