import type { Role } from '../../api/contracts/entities';

export type NavItem = {
  id: string;
  label: string;
  path: string;
  roles: Role[];
};

/** Desktop sidebar entries — Admin sees 9, Seller sees the first 4. */
export const DESKTOP_NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    roles: ['ADMINISTRATOR', 'SELLER'],
  },
  {
    id: 'inventory',
    label: 'Inventario',
    path: '/inventory',
    roles: ['ADMINISTRATOR', 'SELLER'],
  },
  {
    id: 'sales',
    label: 'Ventas y Facturas',
    path: '/sales',
    roles: ['ADMINISTRATOR', 'SELLER'],
  },
  {
    id: 'customers',
    label: 'Clientes',
    path: '/customers',
    roles: ['ADMINISTRATOR', 'SELLER'],
  },
  {
    id: 'work-orders',
    label: 'Órdenes de Trabajo',
    path: '/work-orders',
    roles: ['ADMINISTRATOR'],
  },
  {
    id: 'catalogs',
    label: 'Catálogos',
    path: '/catalogs',
    roles: ['ADMINISTRATOR'],
  },
  {
    id: 'users',
    label: 'Usuarios',
    path: '/users',
    roles: ['ADMINISTRATOR'],
  },
  {
    id: 'profitability',
    label: 'Rentabilidad',
    path: '/profitability',
    roles: ['ADMINISTRATOR'],
  },
  {
    id: 'recovery',
    label: 'Administración y Recuperación',
    path: '/recovery',
    roles: ['ADMINISTRATOR'],
  },
];

export function navItemsForRole(role: Role): NavItem[] {
  return DESKTOP_NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/** Registered desktop routes — unknown paths should 404, not unauthorized. */
const KNOWN_DESKTOP_ROUTE_PATTERNS: RegExp[] = [
  /^\/dashboard$/,
  /^\/inventory$/,
  /^\/inventory\/[^/]+$/,
  /^\/sales$/,
  /^\/sales\/draft\/[^/]+$/,
  /^\/sales\/[^/]+$/,
  /^\/customers$/,
  /^\/work-orders$/,
  /^\/catalogs$/,
  /^\/users$/,
  /^\/profitability$/,
  /^\/recovery$/,
];

export function isKnownDesktopRoute(pathname: string): boolean {
  return KNOWN_DESKTOP_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

/** Sidebar active state — 404/unknown paths must not highlight a parent segment. */
export function isNavItemActive(pathname: string, itemPath: string): boolean {
  if (!isKnownDesktopRoute(pathname)) {
    return false;
  }

  if (pathname === itemPath) {
    return true;
  }

  if (itemPath === '/inventory' && /^\/inventory\/[^/]+$/.test(pathname)) {
    return true;
  }

  if (
    itemPath === '/sales' &&
    (/^\/sales\/draft\/[^/]+$/.test(pathname) || /^\/sales\/[^/]+$/.test(pathname))
  ) {
    return true;
  }

  return false;
}

export function isRouteAllowedForRole(pathname: string, role: Role): boolean {
  const match = DESKTOP_NAV_ITEMS.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );

  if (!match) {
    return true;
  }

  return match.roles.includes(role);
}

export function getRouteLabel(pathname: string): string | undefined {
  const match = DESKTOP_NAV_ITEMS.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );

  return match?.label;
}

export function defaultPathForRole(role: Role): string {
  switch (role) {
    case 'MECHANIC':
      return '/mechanic';
    case 'ADMINISTRATOR':
    case 'SELLER':
      return '/dashboard';
  }
}
