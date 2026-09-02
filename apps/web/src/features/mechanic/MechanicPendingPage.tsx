import { useNavigate } from 'react-router-dom';

import { Empty, Info, useToast } from '../../shared/ui';
import { MechanicOrderCard } from './MechanicOrderCard';
import { useMechanicOrders } from './useMechanicOrders';

export function MechanicPendingPage() {
  const { result, isMutating, takeOrder } = useMechanicOrders();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  if (result.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar la cola">
        {result.error.message}
      </Info>
    );
  }

  if (result.status === 'loading') {
    return (
      <p className="text-sm text-navy-400" aria-live="polite">
        Cargando pendientes…
      </p>
    );
  }

  const pending = result.orders.filter((order) => order.status === 'PENDING');

  async function handleTake(workOrderId: string) {
    const response = await takeOrder(workOrderId);
    if (!response.ok) {
      pushToast(response.error.message, 'error');
      return;
    }
    pushToast('Orden tomada', 'success');
    navigate(response.value.href);
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">Pendientes</h1>
        <p className="mt-1 text-sm text-navy-400">
          Cola compartida. Al tomar una orden queda asignada a usted.
        </p>
      </header>

      {pending.length === 0 ? (
        <Empty
          title="No hay órdenes pendientes"
          description="Las nuevas órdenes de desarme o instalación aparecerán aquí."
        />
      ) : (
        <ul className="space-y-3">
          {pending.map((order) => (
            <li key={order.id}>
              <MechanicOrderCard order={order} isMutating={isMutating} onTake={handleTake} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
