import type { ReactNode } from 'react';

export type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Icon-only control aligned with the title (e.g. back navigation). */
  leading?: ReactNode;
};

export function PageHeader({ title, description, actions, leading }: PageHeaderProps) {
  return (
    <header className="mb-8 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        {leading}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold break-words text-navy sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-navy-400">{description}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
