import type { ReactNode } from 'react';

import { Card } from '../ui';

type KpiTone = 'default' | 'amber' | 'brand';

export type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: KpiTone;
  icon?: ReactNode;
};

const toneBorder: Record<KpiTone, string> = {
  default: 'border-navy-100',
  amber: 'border-amber-200',
  brand: 'border-brand/30',
};

/**
 * Compact metric tile used on Dashboard (and later profitability).
 */
export function KpiCard({ label, value, hint, tone = 'default', icon }: KpiCardProps) {
  return (
    <Card className={`${toneBorder[tone]}`} padding="md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</p>
        {icon}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-navy-400">{hint}</p>}
    </Card>
  );
}
