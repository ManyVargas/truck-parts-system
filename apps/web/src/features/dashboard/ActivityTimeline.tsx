import type { ActivityRow } from '../../api/contracts/dashboard';
import { EventTimeline } from '../../shared/ui';

export type ActivityTimelineProps = {
  events: ActivityRow[];
};

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <EventTimeline
      title="Actividad reciente"
      subtitle="Quién hizo cada cambio en el dataset demo"
      emptyTitle="Sin actividad registrada"
      events={events}
    />
  );
}
