import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '../ui';

type KpiTone = 'default' | 'amber' | 'brand';

export type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: KpiTone;
  icon?: ReactNode;
  /** When set, the whole tile is a keyboard-accessible shortcut to an existing list. */
  to?: string;
};

const toneBorder: Record<KpiTone, string> = {
  default: 'border-navy-100',
  amber: 'border-amber-200',
  brand: 'border-brand/30',
};

/**
 * Compact metric tile used on Dashboard and Profitability.
 * Without `to` it stays a static card (Profitability, recovery).
 */
export function KpiCard({ label, value, hint, tone = 'default', icon, to }: KpiCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</p>
        <div className="flex shrink-0 items-center gap-2">
          {icon}
          {to ? (
            <span className="text-sm font-medium text-navy-300" aria-hidden="true">
              →
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-navy-400">{hint}</p>}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/50"
      >
        <Card
          className={`h-full transition-colors hover:bg-navy-50/50 ${toneBorder[tone]}`}
          padding="md"
        >
          {content}
        </Card>
      </Link>
    );
  }

  return (
    <Card className={`${toneBorder[tone]}`} padding="md">
      {content}
    </Card>
  );
}
