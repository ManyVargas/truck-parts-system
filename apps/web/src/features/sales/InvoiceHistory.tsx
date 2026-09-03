import type { InvoiceHistoryEntry } from '../../api/contracts/sales';
import { EventTimeline } from '../../shared/ui';

export function InvoiceHistory({ events }: { events: InvoiceHistoryEntry[] }) {
  return (
    <EventTimeline
      title="Historial"
      subtitle="Eventos vinculados a este documento"
      emptyTitle="Sin eventos vinculados"
      events={events}
    />
  );
}
