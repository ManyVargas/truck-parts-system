import type { ActivityRow } from '../../api/contracts/dashboard';
import { Empty, SectionTitle } from '../../shared/ui';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-DO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export type ActivityTimelineProps = {
  events: ActivityRow[];
};

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <section>
      <SectionTitle title="Actividad reciente" subtitle="Eventos del dataset demo" />

      {events.length === 0 ? (
        <Empty title="Sin actividad registrada" />
      ) : (
        <ol className="relative space-y-0 border-l border-navy-200 pl-6">
          {events.map((event) => (
            <li key={event.id} className="relative pb-6 last:pb-0">
              <span className="absolute -left-[1.54rem] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand" />
              <p className="text-sm font-medium text-navy">{event.description}</p>
              <p className="mt-0.5 text-xs text-navy-400">{DATE_FORMATTER.format(new Date(event.createdAt))}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
