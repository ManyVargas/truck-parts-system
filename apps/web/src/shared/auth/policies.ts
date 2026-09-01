import type { Role, User } from '../../api/contracts/entities';

/** Actions validated in mock services; expanded per milestone. */
export type PolicyAction =
  | 'dashboard.view'
  | 'inventory.view'
  | 'inventory.register'
  | 'inventory.admin'
  | 'customers.manage'
  | 'sales.manage'
  | 'sales.cancel'
  | 'sales.correctCurrency'
  | 'workOrders.manage'
  | 'workOrders.take'
  | 'workOrders.complete'
  | 'catalogs.manage'
  | 'users.manage'
  | 'profile.update'
  | 'profit.view'
  | 'recovery.manage';

export type PolicyContext = Record<string, unknown>;

/**
 * Authorization skeleton — full matrix wired in WM2+.
 * Services must call this before mutating state; route guards are UX-only.
 */
export function can(
  user: User | null,
  action: PolicyAction,
  _context?: PolicyContext,
): boolean {
  if (!user?.active) {
    return false;
  }

  const role = user.role;

  if (role === 'ADMINISTRATOR') {
    return true;
  }

  if (role === 'SELLER') {
    const sellerAllowed: PolicyAction[] = [
      'dashboard.view',
      'inventory.view',
      'inventory.register',
      'customers.manage',
      'sales.manage',
      'profile.update',
    ];
    return sellerAllowed.includes(action);
  }

  if (role === 'MECHANIC') {
    const mechanicAllowed: PolicyAction[] = [
      'workOrders.take',
      'workOrders.complete',
      'profile.update',
    ];
    return mechanicAllowed.includes(action);
  }

  return false;
}

export function roleLabel(role: Role): string {
  switch (role) {
    case 'ADMINISTRATOR':
      return 'Administrador';
    case 'SELLER':
      return 'Vendedor';
    case 'MECHANIC':
      return 'Mecánico';
  }
}
