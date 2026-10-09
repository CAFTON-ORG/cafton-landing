import type { Metadata } from "next";
import { PageHero, PageSection, PageShell } from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { EventRow } from "@/components/events/event-row";
import { FeaturedEvent } from "@/components/events/featured-event";
import { getEventStatus } from "@/lib/events";
import { listEvents } from "@/lib/repositories/events";
import { pageMetadata } from "@/lib/seo";
import type { EventStatus } from "@/types/content";

export const metadata: Metadata = pageMetadata({
  title: "Events",
  description:
    "Giveaways, merch drops, and community events from Cafton. See what is open now, what you can win, and how to join.",
  path: "/events",
});

// Status depends on the current date, so refresh the static page regularly.
export const revalidate = 600;

const STATUS_ORDER: Record<EventStatus, number> = { open: 0, upcoming: 1, closed: 2 };

export default async function EventsPage() {
  const events = await listEvents();
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
                See what is open right now, what you can win, and how to take part.
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>

      {featured && <FeaturedEvent event={featured.event} status={featured.status} />}

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
                More events are on the way. Follow our social channels to hear about them first.
              </p>
            )}
          </Reveal>
        </PageShell>
      </PageSection>

      <ProjectCta />
    </>
  );
}
