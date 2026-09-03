import type { ReactNode } from 'react';

import type { Role } from '../../api/contracts/entities';
import { Logo } from '../ui';
import { COMMERCIAL_SIDEBAR_ID } from './breakpoints';
import { RoleNav } from './RoleNav';

export type CommercialSidebarProps = {
  role: Role;
  density: 'full' | 'compact';
  headerAction?: ReactNode;
  onNavigate?: () => void;
};

export function CommercialSidebar({
  role,
  density,
  headerAction,
  onNavigate,
}: CommercialSidebarProps) {
  const compact = density === 'compact';

  return (
    <aside
      id={COMMERCIAL_SIDEBAR_ID}
      tabIndex={-1}
      className={`flex h-full shrink-0 flex-col bg-shell text-white outline-none ${compact ? 'w-52' : 'w-64'}`}
    >
      <div
        className={`flex items-center gap-2 border-b border-shell-border ${compact ? 'px-3 py-3' : 'px-4 py-5'}`}
      >
        <div className="min-w-0 flex-1">
          <Logo size={compact ? 'sm' : 'md'} />
        </div>
        {headerAction}
      </div>
      <RoleNav role={role} compact={compact} onNavigate={onNavigate} />
    </aside>
  );
}
