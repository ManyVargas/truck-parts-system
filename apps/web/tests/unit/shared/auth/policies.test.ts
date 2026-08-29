import { describe, expect, it } from 'vitest';

import type { Role, User } from '../../../../src/api/contracts/entities';
import { can, roleLabel, type PolicyAction } from '../../../../src/shared/auth/policies';

function user(role: Role, active = true): User {
  return {
    id: `U-${role}`,
    name: role,
    username: role.toLowerCase(),
    password: 'test',
    role,
    active,
  };
}

describe('authorization policies', () => {
  it('grants administrators every declared action', () => {
    const actions: PolicyAction[] = [
      'dashboard.view',
      'inventory.view',
      'inventory.register',
      'inventory.admin',
      'customers.manage',
      'sales.manage',
      'sales.cancel',
      'sales.correctCurrency',
      'workOrders.manage',
      'workOrders.take',
      'workOrders.complete',
      'catalogs.manage',
      'users.manage',
      'profit.view',
      'recovery.manage',
    ];

    expect(actions.every((action) => can(user('ADMINISTRATOR'), action))).toBe(true);
  });

  it('limits sellers to operational inventory, customer and sales actions', () => {
    const seller = user('SELLER');

    expect(can(seller, 'dashboard.view')).toBe(true);
    expect(can(seller, 'inventory.view')).toBe(true);
    expect(can(seller, 'customers.manage')).toBe(true);
    expect(can(seller, 'sales.manage')).toBe(true);
    expect(can(seller, 'inventory.admin')).toBe(false);
    expect(can(seller, 'profit.view')).toBe(false);
    expect(can(seller, 'workOrders.manage')).toBe(false);
  });

  it('limits mechanics to taking and completing work orders', () => {
    const mechanic = user('MECHANIC');

    expect(can(mechanic, 'workOrders.take')).toBe(true);
    expect(can(mechanic, 'workOrders.complete')).toBe(true);
    expect(can(mechanic, 'inventory.view')).toBe(false);
    expect(can(mechanic, 'customers.manage')).toBe(false);
  });

  it('denies guests and inactive users regardless of role', () => {
    expect(can(null, 'dashboard.view')).toBe(false);
    expect(can(user('ADMINISTRATOR', false), 'users.manage')).toBe(false);
  });

  it('provides the approved Spanish role labels', () => {
    expect(roleLabel('ADMINISTRATOR')).toBe('Administrador');
    expect(roleLabel('SELLER')).toBe('Vendedor');
    expect(roleLabel('MECHANIC')).toBe('Mecánico');
  });
});
