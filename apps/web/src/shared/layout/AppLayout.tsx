import type { ReactNode } from 'react';

import { AppShell } from './AppShell';

export type AppLayoutProps = {
  children: ReactNode;
  /** @deprecated WM2 — use AppShell with router outlets instead. */
  activeNav?: string;
};

/**
 * @deprecated Use AppShell with React Router nested routes (WM2+).
 * Kept temporarily for WM1 FoundationPage during transition.
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-surface text-navy">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

export { AppShell };
