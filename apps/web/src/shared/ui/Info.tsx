import type { ReactNode } from 'react';

type InfoTone = 'info' | 'warning' | 'success' | 'error';

export type InfoProps = {
  children: ReactNode;
  tone?: InfoTone;
  title?: string;
  id?: string;
};

const toneClasses: Record<InfoTone, string> = {
  info: 'border-brand-light/40 bg-brand/5 text-navy',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
};

export function Info({ children, tone = 'info', title, id }: InfoProps) {
  const isError = tone === 'error';

  return (
    <div
      id={id}
      role={isError ? 'alert' : undefined}
      tabIndex={isError ? -1 : undefined}
      className={`rounded-lg border px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-light/50 ${toneClasses[tone]}`}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
