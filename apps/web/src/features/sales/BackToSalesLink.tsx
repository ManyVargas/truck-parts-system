import { Link } from 'react-router-dom';

export function BackToSalesLink() {
  return (
    <Link
      to="/sales"
      aria-label="Volver a Ventas y Facturas"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-navy hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/50"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="currentColor"
          d="M15.53 4.22a.75.75 0 0 1 0 1.06L9.81 11l5.72 5.72a.75.75 0 1 1-1.06 1.06l-6.25-6.25a.75.75 0 0 1 0-1.06l6.25-6.25a.75.75 0 0 1 1.06 0Z"
        />
      </svg>
    </Link>
  );
}
