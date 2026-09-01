import { Outlet } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import { DemoControls } from '../../shared/layout/DemoControls';
import { UserMenu } from '../../shared/layout/UserMenu';
import { MechanicBottomNav } from './MechanicBottomNav';

/**
 * Mobile-first mechanic shell (~430px): pending queue, assigned work, evidence.
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

      <MechanicBottomNav />
    </div>
  );
}
