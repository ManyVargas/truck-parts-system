import { Outlet } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { Logo } from '../ui';
import { DemoControls } from './DemoControls';
import { RoleNav } from './RoleNav';
import { UserMenu } from './UserMenu';

/**
 * Desktop shell for Administrator and Seller — sidebar + header + content outlet.
 */
export function AppShell() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex h-full w-64 shrink-0 flex-col bg-shell text-white">
        <div className="border-b border-shell-border px-4 py-5">
          <Logo size="md" />
        </div>

        <RoleNav role={user.role} />

        <p className="border-t border-shell-border px-4 py-3 text-xs text-white/50">
          {user.role === 'ADMINISTRATOR' ? '9 secciones' : '4 secciones'}
        </p>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface text-navy">
        <header className="flex shrink-0 items-center justify-between border-b border-navy-100 bg-white px-4 py-3 sm:px-6">
          <p className="text-sm text-navy-400">Prototipo SoloCamiones</p>
          <div className="flex items-center gap-3">
            <DemoControls />
            <UserMenu user={user} onLogout={logout} />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
