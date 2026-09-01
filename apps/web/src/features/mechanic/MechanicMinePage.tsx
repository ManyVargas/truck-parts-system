import { Empty, Info } from '../../shared/ui';
import { MechanicOrderCard } from './MechanicOrderCard';
import { useMechanicOrders } from './useMechanicOrders';

export function MechanicMinePage() {
  const { result } = useMechanicOrders();

  if (result.status === 'error') {
    return (
      <Info tone="error" title="No se pudieron cargar sus órdenes">
        {result.error.message}
      </Info>
    );
  }

  if (result.status === 'loading') {
    return (
      <p className="text-sm text-navy-400" aria-live="polite">
        Cargando mis órdenes…
      </p>
    );
  }

  const mine = result.orders.filter((order) => order.status !== 'PENDING');

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">Mis órdenes</h1>
        <p className="mt-1 text-sm text-navy-400">Trabajo asignado a usted, en proceso o completado.</p>
      </header>

      {mine.length === 0 ? (
        <Empty
          title="Aún no tiene órdenes"
          description="Tome una OT pendiente para que aparezca aquí."
        />
      ) : (
        <ul className="space-y-3">
          {mine.map((order) => (
            <li key={order.id}>
              <MechanicOrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
