import Link from "next/link";
import { ArrowDown, ArrowLeft } from "lucide-react";
import { PageHero, PageShell } from "@/components/layout/page-shell";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { EventFacts } from "@/components/events/event-facts";
import { EventPoster } from "@/components/events/event-poster";
import { EventStatusBadge } from "@/components/events/event-status";
import { Byline } from "@/components/shared/byline";
import type { Author, CaftonEvent, EventStatus } from "@/types/content";

interface EventHeroProps {
  event: CaftonEvent;
  status: EventStatus;
  author?: Author;
  /** Whether the entry form is live, which decides what the button points at. */
  canEnter: boolean;
}

/** Top of an event page: status, title, summary, facts, who posted it, and the poster. */
export function EventHero({ event, status, author, canEnter }: EventHeroProps) {
  return (
    <PageHero>
      <PageShell>
        <Link
          href="/events"
          className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="me-2 size-4" aria-hidden="true" />
          All events
        </Link>

        <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <RevealGroup>
            <RevealItem className="flex flex-wrap items-center gap-3">
              <EventStatusBadge status={status} />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {event.type}
              </span>
            </RevealItem>
            <RevealItem>
              <h1 className="mt-6 text-balance text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
                {event.title}
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">{event.summary}</p>
            </RevealItem>
            <RevealItem>
              <EventFacts event={event} className="mt-8" />
            </RevealItem>
            {author && (
              <RevealItem>
                <Byline author={author} label="Posted by" className="mt-6" />
              </RevealItem>
            )}
            <RevealItem>
              <Button asChild className="group mt-8 cursor-pointer">
                <a href={canEnter ? "#enter" : "#prizes"}>
                  {canEnter ? "Enter the giveaway" : "See the prizes"}
                  <ArrowDown className="ms-2 size-4 transition-transform group-hover:translate-y-0.5" />
                </a>
              </Button>
            </RevealItem>
          </RevealGroup>

          <Reveal>
            <EventPoster event={event} priority />
          </Reveal>
        </div>
      </PageShell>
    </PageHero>
  );
}
