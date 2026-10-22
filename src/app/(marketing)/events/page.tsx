import type { Metadata } from "next";
import { PageHero, PageSection, PageShell } from "@/components/marketing/layout/page-shell";
import { ProjectCta } from "@/components/marketing/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { EventList } from "@/components/marketing/events/event-list";
import { FeaturedEvent } from "@/components/marketing/events/featured-event";
import { getEventStatus } from "@/features/cms/lib/events";
import { listEvents } from "@/features/cms/repository/events";
import { pageSeo } from "@/features/cms/repository/seo";
import type { EventStatus } from "@/features/cms/types";

export async function generateMetadata(): Promise<Metadata> {
  return pageSeo("events");
}

// Status depends on the current date, so refresh the static page regularly.
export const revalidate = 600;

const STATUS_ORDER: Record<EventStatus, number> = { open: 0, upcoming: 1, closed: 2 };

export default async function EventsPage() {
  const events = await listEvents();
  const ranked = events
    .map((event) => ({ event, status: getEventStatus(event) }))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const [featured, ...others] = ranked;
  // What can still be entered comes first; finished events sit in an archive below.
  const current = others.filter(({ status }) => status !== "closed").map(({ event }) => event);
  const past = others.filter(({ status }) => status === "closed").map(({ event }) => event);

  return (
    <>
      <PageHero variant="compact">
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
          {others.length > 0 ? (
            <div className="space-y-16">
              {current.length > 0 && (
                <EventList heading="Open and upcoming" events={current} />
              )}
              {past.length > 0 && (
                <EventList heading="Past events" events={past} paged />
              )}
            </div>
          ) : (
            <Reveal>
              <h2 className="text-2xl font-bold tracking-tight">More events</h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                More events are on the way. Follow our social channels to hear about them first.
              </p>
            </Reveal>
          )}
        </PageShell>
      </PageSection>

      <ProjectCta />
    </>
  );
}
