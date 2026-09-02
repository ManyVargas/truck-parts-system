import { Outlet } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import { DemoControls } from '../../shared/layout/DemoControls';
import { UserMenu } from '../../shared/layout/UserMenu';
import { MechanicBottomNav } from './MechanicBottomNav';

/**
 * Mobile-first mechanic shell: header, scrolling work area, bottom nav.
 * Input text-base avoids iOS zoom on focus; h-dvh keeps the nav on screen.
 */
export function MechanicLayout() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[430px] min-w-0 flex-col bg-surface text-navy touch-manipulation [&_input]:min-h-12 [&_input]:text-base">
      <header className="flex min-w-0 shrink-0 items-center justify-between gap-2 border-b border-navy-100 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm text-navy-400">App Mecánico</p>
          <p className="truncate text-base font-semibold">{user.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DemoControls />
          <UserMenu user={user} onLogout={logout} />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <Outlet />
      </main>

      <MechanicBottomNav />
    </div>
  );
}
