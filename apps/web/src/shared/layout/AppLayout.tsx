import type { ReactNode } from 'react';

import { Logo } from '../ui/Logo';

export type AppLayoutProps = {
  children: ReactNode;
  /** Ítem activo en sidebar preview — nav completa en WM2. */
  activeNav?: string;
};

/** Placeholder de navegación; WM2 reemplaza por RoleNav según rol. */
const PREVIEW_NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'inventory', label: 'Inventario' },
  { id: 'sales', label: 'Ventas y Facturas' },
  { id: 'customers', label: 'Clientes' },
] as const;

/**
 * Shell Opción C: sidebar oscuro + contenido claro.
 * El logo vive en zona oscura; el trabajo diario en surface.
 */
export function AppLayout({ children, activeNav = 'dashboard' }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-shell text-white">
        <div className="border-b border-shell-border px-4 py-5">
          <Logo size="md" />
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Navegación principal">
          {PREVIEW_NAV.map((item) => {
            const isActive = item.id === activeNav;

            return (
              <span
                key={item.id}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'border-l-2 border-brand-light bg-shell-muted text-brand-light'
                    : 'text-white/70'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </span>
            );
          })}
        </nav>

        <p className="border-t border-shell-border px-4 py-3 text-xs text-white/50">
          Nav por rol en WM2
        </p>
      </aside>

      <main className="min-w-0 flex-1 bg-surface text-navy">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
