import { Empty } from './Empty';
import { SectionTitle } from './SectionTitle';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-DO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export type TimelineEvent = {
  id: string;
  description: string;
  createdAt: string;
  actorName?: string;
};

export type EventTimelineProps = {
  title: string;
  subtitle?: string;
  emptyTitle: string;
  events: TimelineEvent[];
};

function eventAttribution(event: TimelineEvent): string {
  const when = DATE_FORMATTER.format(new Date(event.createdAt));
  return event.actorName ? `${when} · por ${event.actorName}` : when;
}

export function EventTimeline({ title, subtitle, emptyTitle, events }: EventTimelineProps) {
  return (
    <section>
      <SectionTitle title={title} subtitle={subtitle} />

      {events.length === 0 ? (
        <Empty title={emptyTitle} />
      ) : (
        <ol className="relative space-y-0 border-l border-navy-200 pl-6">
          {events.map((event) => (
            <li key={event.id} className="relative pb-6 last:pb-0">
              <span className="absolute -left-[1.54rem] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand" />
              <p className="text-sm font-medium text-navy">{event.description}</p>
              <p className="mt-0.5 text-xs text-navy-400">{eventAttribution(event)}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
