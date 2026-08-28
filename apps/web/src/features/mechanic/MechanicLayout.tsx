import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { DemoControls } from '../../shared/layout/DemoControls';
import { UserMenu } from '../../shared/layout/UserMenu';

const MECHANIC_NAV = [
  { id: 'pending', label: 'Pendientes', path: '/mechanic/pending' },
  { id: 'mine', label: 'Mis órdenes', path: '/mechanic/mine' },
  { id: 'profile', label: 'Perfil', path: '/mechanic/profile' },
] as const;

/**
 * Mobile-first mechanic shell (~430px) — full flows in WM10.
 */
export function MechanicLayout() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col bg-surface text-navy">
      <header className="flex items-center justify-between border-b border-navy-100 bg-white px-4 py-3">
        <div>
          <p className="text-xs text-navy-400">App Mecánico</p>
          <p className="font-semibold">{user.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <DemoControls />
          <UserMenu user={user} onLogout={logout} />
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        <Outlet />
      </main>

      <nav
        className="sticky bottom-0 grid grid-cols-3 border-t border-navy-100 bg-white"
        aria-label="Navegación mecánico"
      >
        {MECHANIC_NAV.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              `px-2 py-3 text-center text-xs font-medium ${
                isActive ? 'text-brand' : 'text-navy-400'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
