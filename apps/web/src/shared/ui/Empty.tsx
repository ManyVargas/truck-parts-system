import type { ReactNode } from 'react';

export type EmptyProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function Empty({ title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-navy-200 bg-navy-50/50 px-6 py-12 text-center">
      <p className="text-base font-medium text-navy">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-navy-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
