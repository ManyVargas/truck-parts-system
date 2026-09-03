import type { WorkOrderHistoryEntry } from '../../api/contracts/work-orders';
import { EventTimeline } from '../../shared/ui';

export function WorkOrderHistory({ events }: { events: WorkOrderHistoryEntry[] }) {
  return (
    <EventTimeline
      title="Historial"
      subtitle="Eventos vinculados a esta orden"
      emptyTitle="Sin eventos vinculados"
      events={events}
    />
  );
}
