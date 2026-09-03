import { Link } from 'react-router-dom';

import type { MechanicWorkOrderView } from '../../api/contracts/entities';
import { Empty } from '../../shared/ui';
import { MechanicOrderCard } from './MechanicOrderCard';
import { MechanicQueryError } from './MechanicQueryError';
import { useMechanicOrders } from './useMechanicOrders';

const emptyLinkClass =
  'inline-flex min-h-12 items-center justify-center rounded-lg bg-brand px-5 text-base font-medium text-white';

function OrderList({ orders }: { orders: MechanicWorkOrderView[] }) {
  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <li key={order.id}>
          <MechanicOrderCard order={order} />
        </li>
      ))}
    </ul>
  );
}

export function MechanicMinePage() {
  const { result, reload } = useMechanicOrders();

  if (result.status === 'error') {
    return (
      <MechanicQueryError
        title="No se pudieron cargar sus órdenes"
        error={result.error}
        onRetry={reload}
      />
    );
  }

  if (result.status === 'loading') {
    return (
      <p className="text-base text-navy-400" aria-live="polite">
        Cargando mis órdenes…
      </p>
    );
  }

  const mine = result.orders.filter((order) => order.status !== 'PENDING');
  const inProgress = mine.filter((order) => order.status === 'IN_PROGRESS');
  const completed = mine.filter((order) => order.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Mis órdenes</h1>
        <p className="mt-1 text-base text-navy-400">Trabajo asignado a usted, en proceso o completado.</p>
      </header>

      {mine.length === 0 ? (
        <Empty
          title="Aún no tiene órdenes"
          description="Tome una orden pendiente para que aparezca aquí."
          action={
            <Link to="/mechanic/pending" className={emptyLinkClass}>
              Ver pendientes
            </Link>
          }
        />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">En proceso</h2>
            {inProgress.length === 0 ? (
              <p className="text-base text-navy-400">No hay trabajo en proceso. Tome una orden pendiente.</p>
            ) : (
              <OrderList orders={inProgress} />
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Completadas</h2>
            {completed.length === 0 ? (
              <p className="text-base text-navy-400">Todavía no hay órdenes terminadas.</p>
            ) : (
              <OrderList orders={completed} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
