import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventPoster } from "@/components/events/event-poster";
import { EventRow } from "@/components/events/event-row";
import { EventStatusBadge } from "@/components/events/event-status";
import {
  events,
  getEventFacts,
  getEventStatus,
  type EventStatus,
} from "@/lib/events";

export const metadata: Metadata = {
  title: "Events - CAFTON",
  description:
    "Giveaways, merch drops, and community events from CAFTON. See what is open now and how to join.",
  alternates: { canonical: "/events" },
};

// Status depends on the current date, so refresh the static page regularly.
export const revalidate = 600;

const STATUS_ORDER: Record<EventStatus, number> = { open: 0, upcoming: 1, closed: 2 };

export default function EventsPage() {
  const ranked = events
    .map((event) => ({ event, status: getEventStatus(event) }))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const [featured, ...others] = ranked;

  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem className="mb-4">
              <Badge variant="outline" className="px-3 py-1 text-sm">Events</Badge>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Giveaways and community events.
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                See what is open right now, what you can win, and how to take
                part.
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>

      {featured && (
        <PageSection>
          <PageShell>
            <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
              <Reveal>
                <div className="flex flex-wrap items-center gap-3">
                  <EventStatusBadge status={featured.status} />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {featured.event.type}
                  </span>
                </div>
                <h2 className="mt-6 text-balance text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
                  {featured.event.title}
                </h2>
                <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                  {featured.event.tagline}
                </p>

                <dl className="mt-10 max-w-xl text-sm">
                  {getEventFacts(featured.event).map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-6 border-t border-dashed py-3 last:border-b"
                    >
                      <dt className="font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="text-right font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild className="group cursor-pointer">
                    <Link
                      href={
                        featured.status === "open" && featured.event.campaignUrl
                          ? `/events/${featured.event.slug}#enter`
                          : `/events/${featured.event.slug}`
                      }
                    >
                      {featured.status === "open" && featured.event.campaignUrl
                        ? "Enter the giveaway"
                        : "View details"}
                      <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  {featured.status === "open" && featured.event.campaignUrl && (
                    <Button asChild variant="outline" className="cursor-pointer">
                      <Link href={`/events/${featured.event.slug}`}>View details</Link>
                    </Button>
                  )}
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <EventPoster event={featured.event} priority />
              </Reveal>
            </div>
          </PageShell>
        </PageSection>
      )}

      <PageSection className="border-t">
        <PageShell>
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight">More events</h2>
            {others.length > 0 ? (
              <div className="mt-8">
                {others.map(({ event }) => (
                  <EventRow key={event.slug} event={event} />
                ))}
              </div>
            ) : (
              <p className="mt-3 max-w-xl text-muted-foreground">
                More events are on the way. Follow our social channels to hear
                about them first.
              </p>
            )}
          </Reveal>
        </PageShell>
      </PageSection>

      <ProjectCta />
    </>
  );
}
