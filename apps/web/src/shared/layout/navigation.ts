import type { Role } from '../../api/contracts/entities';
import {
  getAppCapabilities,
  type AppCapabilities,
  type AppCapability,
} from '../config/capabilities';

export type NavItem = {
  id: string;
  label: string;
  path: string;
  roles: Role[];
  /** When set, the item is hidden and its URLs are blocked unless the capability is on. */
  capability?: AppCapability;
};

/** Desktop sidebar entries — Admin sees 9, Seller sees the first 4 when all capabilities are on. */
export const DESKTOP_NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Inicio',
    path: '/dashboard',
    roles: ['ADMINISTRATOR', 'SELLER'],
  },
  {
    id: 'inventory',
    label: 'Inventario',
    path: '/inventory',
    roles: ['ADMINISTRATOR', 'SELLER'],
    capability: 'inventory',
  },
  {
    id: 'sales',
    label: 'Ventas y Facturas',
    path: '/sales',
    roles: ['ADMINISTRATOR', 'SELLER'],
    capability: 'sales',
  },
  {
    id: 'customers',
    label: 'Clientes',
    path: '/customers',
    roles: ['ADMINISTRATOR', 'SELLER'],
    capability: 'customers',
  },
  {
    id: 'work-orders',
    label: 'Órdenes de Trabajo',
    path: '/work-orders',
    roles: ['ADMINISTRATOR'],
    capability: 'workOrders',
  },
  {
    id: 'catalogs',
    label: 'Catálogos',
    path: '/catalogs',
    roles: ['ADMINISTRATOR'],
    capability: 'catalogs',
  },
  {
    id: 'users',
    label: 'Usuarios',
    path: '/users',
    roles: ['ADMINISTRATOR'],
    capability: 'users',
  },
  {
    id: 'profitability',
    label: 'Rentabilidad',
    path: '/profitability',
    roles: ['ADMINISTRATOR'],
    capability: 'profitability',
  },
  {
    id: 'recovery',
    label: 'Administración y Recuperación',
    path: '/recovery',
    roles: ['ADMINISTRATOR'],
    capability: 'recovery',
  },
];

function isNavItemEnabled(item: NavItem, capabilities: AppCapabilities): boolean {
  return !item.capability || capabilities[item.capability];
}

export function navItemsForRole(
  role: Role,
  capabilities: AppCapabilities = getAppCapabilities(),
): NavItem[] {
  return DESKTOP_NAV_ITEMS.filter(
    (item) => item.roles.includes(role) && isNavItemEnabled(item, capabilities),
  );
}

/** Registered desktop routes — unknown paths should 404, not unauthorized. */
const KNOWN_DESKTOP_ROUTE_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/dashboard$/,
  /^\/inventory$/,
  /^\/inventory\/[^/]+$/,
  /^\/sales$/,
  /^\/sales\/draft\/[^/]+$/,
  /^\/sales\/[^/]+$/,
  /^\/customers$/,
  /^\/work-orders$/,
  /^\/work-orders\/[^/]+$/,
  /^\/catalogs$/,
  /^\/users$/,
  /^\/profitability$/,
  /^\/recovery$/,
  /^\/profile$/,
];

const KNOWN_MECHANIC_ROUTE_PATTERNS: RegExp[] = [
  /^\/mechanic$/,
  /^\/mechanic\/pending$/,
  /^\/mechanic\/mine$/,
  /^\/mechanic\/orders\/[^/]+$/,
  /^\/mechanic\/profile$/,
];

export function isKnownDesktopRoute(pathname: string): boolean {
  return KNOWN_DESKTOP_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function isKnownMechanicRoute(pathname: string): boolean {
  return KNOWN_MECHANIC_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export type LayoutAccessDecision = 'allow' | 'forbidden' | 'not_found';

/**
 * Distinguishes “wrong role for a real screen” from “this URL does not exist”.
 * The desktop layout's splat otherwise swallows typos like /invenray and 401s a mechanic.
 */
export function layoutAccessDecision(
  pathname: string,
  userRole: Role,
  layoutRoles: Role[],
): LayoutAccessDecision {
  if (layoutRoles.includes(userRole)) {
    return 'allow';
  }

  const layoutIsMechanic = layoutRoles.length === 1 && layoutRoles[0] === 'MECHANIC';
  const pathExistsInThisLayout = layoutIsMechanic
    ? isKnownMechanicRoute(pathname)
    : isKnownDesktopRoute(pathname);

  return pathExistsInThisLayout ? 'forbidden' : 'not_found';
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

  if (itemPath === '/work-orders' && /^\/work-orders\/[^/]+$/.test(pathname)) {
    return true;
  }

  return false;
}

export function isRouteAllowedForRole(
  pathname: string,
  role: Role,
  capabilities: AppCapabilities = getAppCapabilities(),
): boolean {
  const match = DESKTOP_NAV_ITEMS.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );

  if (!match) {
    return true;
  }

  return match.roles.includes(role) && isNavItemEnabled(match, capabilities);
}

/** Mechanic queue/order URLs require workOrders; profile remains available. */
export function isMechanicPathAllowed(
  pathname: string,
  capabilities: AppCapabilities = getAppCapabilities(),
): boolean {
  if (!isKnownMechanicRoute(pathname)) {
    return true;
  }

  if (pathname === '/mechanic' || pathname === '/mechanic/profile') {
    return true;
  }

  return capabilities.workOrders;
}

export function getRouteLabel(pathname: string): string | undefined {
  const match = DESKTOP_NAV_ITEMS.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );

  return match?.label;
}

export function defaultPathForRole(
  role: Role,
  capabilities: AppCapabilities = getAppCapabilities(),
): string {
  switch (role) {
    case 'MECHANIC':
      return capabilities.workOrders ? '/mechanic' : '/mechanic/profile';
    case 'ADMINISTRATOR':
    case 'SELLER':
      return '/dashboard';
  }
}
