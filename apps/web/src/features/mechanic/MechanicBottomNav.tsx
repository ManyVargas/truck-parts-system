import { NavLink } from 'react-router-dom';

const MECHANIC_NAV = [
  { id: 'pending', label: 'Pendientes', path: '/mechanic/pending' },
  { id: 'mine', label: 'Mis órdenes', path: '/mechanic/mine' },
  { id: 'profile', label: 'Perfil', path: '/mechanic/profile' },
] as const;

export function MechanicBottomNav() {
  return (
    <nav
      className="sticky bottom-0 grid grid-cols-3 border-t border-navy-100 bg-white"
      aria-label="Navegación mecánico"
    >
      {MECHANIC_NAV.map((item) => (
        <NavLink
          key={item.id}
          to={item.path}
          className={({ isActive }) =>
            `min-h-14 px-2 py-3 text-center text-sm font-medium ${
              isActive ? 'text-brand' : 'text-navy-400'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
