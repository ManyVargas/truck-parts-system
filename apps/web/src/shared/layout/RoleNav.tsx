import { NavLink, useLocation } from 'react-router-dom';

import type { Role } from '../../api/contracts/entities';
import { isNavItemActive, navItemsForRole } from './navigation';

export type RoleNavProps = {
  role: Role;
};

export function RoleNav({ role }: RoleNavProps) {
  const location = useLocation();
  const items = navItemsForRole(role);

  return (
    <nav className="flex-1 space-y-1 p-3" aria-label="Navegación principal">
      {items.map((item) => {
        const isActive = isNavItemActive(location.pathname, item.path);

        return (
          <NavLink
            key={item.id}
            to={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-l-2 border-brand-light bg-shell-muted text-brand-light'
                : 'text-white/70 hover:bg-shell-muted hover:text-white'
            }`}
          >
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
