import type { MouseEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-navy-100 bg-white">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
}

function clickCameFromControl(event: MouseEvent<HTMLTableRowElement>): boolean {
  const target = event.target;
  return target instanceof Element && Boolean(target.closest('a, button, input, select, textarea'));
}

/** Hover always. When `to` is set, clicking empty cells opens that route; real links/buttons keep their own action. */
export function HoverRow({ children, to }: { children: ReactNode; to?: string }) {
  const navigate = useNavigate();

  return (
    <tr
      className={`text-navy hover:bg-navy-50/60${to ? ' cursor-pointer' : ''}`}
      onClick={
        to
          ? (event) => {
              if (clickCameFromControl(event)) {
                return;
              }
              navigate(to);
            }
          : undefined
      }
    >
      {children}
    </tr>
  );
}

export function EntityLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-medium text-brand hover:underline">
      {children}
    </Link>
  );
}
