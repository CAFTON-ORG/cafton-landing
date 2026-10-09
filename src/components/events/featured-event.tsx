import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { EventFacts } from "@/components/events/event-facts";
import { EventPoster } from "@/components/events/event-poster";
import { EventStatusBadge } from "@/components/events/event-status";
import type { CaftonEvent, EventStatus } from "@/types/content";

/** The lead event on the index: big title, facts, the poster, and the one action that matters for its status. */
export function FeaturedEvent({ event, status }: { event: CaftonEvent; status: EventStatus }) {
  const canEnter = status === "open" && Boolean(event.campaignUrl);
  const href = `/events/${event.slug}`;

  return (
    <PageSection>
      <PageShell>
        <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <Reveal>
            <div className="flex flex-wrap items-center gap-3">
              <EventStatusBadge status={status} />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {event.type}
              </span>
            </div>
            <h2 className="mt-6 text-balance text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
              {event.title}
            </h2>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">{event.tagline}</p>

            <EventFacts event={event} className="mt-10" />

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="group cursor-pointer">
                <Link href={canEnter ? `${href}#enter` : href}>
                  {canEnter ? "Enter the giveaway" : "View details"}
                  <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              {canEnter && (
                <Button asChild variant="outline" className="cursor-pointer">
                  <Link href={href}>View details</Link>
                </Button>
              )}
            </div>
          </Reveal>

          <Reveal>
            <EventPoster event={event} priority />
          </Reveal>
        </div>
      </PageShell>
    </PageSection>
  );
}
