import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EventStatusBadge } from "@/components/events/event-status";
import { CoverArt } from "@/components/shared/cover-art";
import {
  formatEventDates,
  getEventStatus,
  type CaftonEvent,
} from "@/lib/events";

/** One ruled line in the events index: poster thumbnail, title, dates, status. */
export function EventRow({ event }: { event: CaftonEvent }) {
  const status = getEventStatus(event);
  const thumbnail = event.poster?.src ?? event.prizes.find((prize) => prize.image)?.image;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group grid grid-cols-[4rem_1fr] items-center gap-x-5 gap-y-3 border-b py-6 outline-none first:border-t hover:bg-muted/30 focus-visible:bg-muted/40 sm:grid-cols-[5rem_1fr_auto_auto] sm:gap-x-8"
    >
      <div className="relative aspect-1400/1974 w-full overflow-hidden rounded-md">
        {thumbnail ? (
          <Image src={thumbnail} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <CoverArt />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {event.type} &middot; {formatEventDates(event)}
        </p>
        <h3 className="mt-1 text-balance text-lg font-semibold tracking-tight sm:text-xl">
          {event.title}
        </h3>
      </div>
      <EventStatusBadge status={status} className="col-start-2 sm:col-start-auto" />
      <ArrowRight
        aria-hidden="true"
        className="hidden size-5 transition-transform duration-300 group-hover:translate-x-1 sm:block"
      />
    </Link>
  );
}
