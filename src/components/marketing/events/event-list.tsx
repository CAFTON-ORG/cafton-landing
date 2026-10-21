import { Reveal } from "@/components/marketing/motion/reveal";
import { EventRow } from "@/components/marketing/events/event-row";
import { LoadMoreList } from "@/components/marketing/patterns/load-more-list";
import type { CaftonEvent } from "@/features/cms/types";

interface EventListProps {
  heading: string;
  events: CaftonEvent[];
  /** Past events can pile up, so they show a few at a time. */
  paged?: boolean;
}

/** A titled run of event rows; long archives get a "Show more" button. */
export function EventList({ heading, events, paged }: EventListProps) {
  const rows = events.map((event) => <EventRow key={event.slug} event={event} />);

  return (
    <Reveal>
      <h2 className="text-2xl font-bold tracking-tight">{heading}</h2>
      <div className="mt-8">
        {paged ? <LoadMoreList items={rows} noun="events" /> : rows}
      </div>
    </Reveal>
  );
}
