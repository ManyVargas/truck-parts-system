const LINE_WIDTHS = ['100%', '92%', '96%', '88%', '94%'] as const;

const LINE_HEIGHT: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-3 rounded-md',
  md: 'h-4 rounded-md',
  lg: 'h-16 rounded-xl',
};

export type SkeletonProps = {
  /** Accessible name announced while the page is loading. */
  label: string;
  className?: string;
  lines?: number;
  variant?: 'lines' | 'cards';
  /** Mechanic screens keep pulse blocks large enough to read as cards. */
  size?: 'sm' | 'md' | 'lg';
};

export function Skeleton({
  label,
  className = '',
  lines = 5,
  variant = 'lines',
  size = 'md',
}: SkeletonProps) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" aria-label={label} className={className}>
      <p className="sr-only">{label}</p>
      {variant === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
          {Array.from({ length: lines }, (_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-navy-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: lines }, (_, index) => (
            <div
              key={index}
              className={`animate-pulse bg-navy-100 ${LINE_HEIGHT[size]}`}
              style={{ width: LINE_WIDTHS[index % LINE_WIDTHS.length] }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
