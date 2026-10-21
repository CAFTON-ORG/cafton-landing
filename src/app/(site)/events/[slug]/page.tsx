import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { EventAbout } from "@/components/events/event-about";
import { EventEntry } from "@/components/events/event-entry";
import { EventHero } from "@/components/events/event-hero";
import { EventPrizes } from "@/components/events/event-prizes";
import { EventPromo } from "@/components/events/event-promo";
import { EventSteps } from "@/components/events/event-steps";
import { JsonLd } from "@/components/shared/json-ld";
import { getEventStatus } from "@/lib/events";
import { getAuthor } from "@/lib/repositories/authors";
import { getEvent, listEvents } from "@/lib/repositories/events";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

// Status depends on the current date, so refresh the static page regularly.
export const revalidate = 600;

export async function generateStaticParams() {
  return (await listEvents()).map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return {};

  return pageMetadata({
    title: event.title,
    description: event.summary,
    path: `/events/${event.slug}`,
    image: event.poster
      ? { url: event.poster.src, width: event.poster.width, height: event.poster.height, alt: event.poster.alt }
      : undefined,
  });
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const author = await getAuthor(event.authorId);
  const status = getEventStatus(event);
  const canEnter = status === "open" && Boolean(event.campaignUrl);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Events", path: "/events" },
          { name: event.title, path: `/events/${event.slug}` },
        ])}
      />
      <EventHero event={event} status={status} author={author} canEnter={canEnter} />
      {event.about && <EventAbout paragraphs={event.about} />}
      <EventPrizes prizes={event.prizes} heading={event.prizesHeading} divided={Boolean(event.about)} />
      {event.steps && event.steps.length > 0 && <EventSteps steps={event.steps} />}
      {event.promo && <EventPromo promo={event.promo} />}
      <EventEntry event={event} status={status} />
      <ProjectCta />
    </>
  );
}
