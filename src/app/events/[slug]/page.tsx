import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowLeft } from "lucide-react";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { EventPoster } from "@/components/events/event-poster";
import { EventStatusBadge } from "@/components/events/event-status";
import { GleamWidget } from "@/components/events/gleam-widget";
import { socialLinks } from "@/components/layout/footer";
import {
  events,
  formatEventDates,
  getEvent,
  getEventStatus,
} from "@/lib/events";

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

// Status depends on the current date, so refresh the static page regularly.
export const revalidate = 600;

export function generateStaticParams() {
  return events.map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) return {};

  return {
    title: `${event.title} - CAFTON Events`,
    description: event.summary,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      type: "website",
      title: `${event.title} - CAFTON`,
      description: event.summary,
      url: `/events/${event.slug}`,
      images: [
        {
          url: event.poster.src,
          width: event.poster.width,
          height: event.poster.height,
          alt: event.poster.alt,
        },
      ],
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  const status = getEventStatus(event);

  return (
    <>
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
                <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                  {event.summary}
                </p>
              </RevealItem>
              <RevealItem>
                <dl className="mt-8 max-w-xl text-sm">
                  {[
                    ["When", formatEventDates(event)],
                    ["Prizes", `${event.prizes.length} winners`],
                    ["Enter", "Online, through Gleam"],
                  ].map(([label, value]) => (
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
              </RevealItem>
              <RevealItem>
                <Button asChild className="group mt-8 cursor-pointer">
                  <a href={status === "open" ? "#enter" : "#prizes"}>
                    {status === "open" ? "Enter the giveaway" : "See the prizes"}
                    <ArrowDown className="ms-2 size-4 transition-transform group-hover:translate-y-0.5" />
                  </a>
                </Button>
              </RevealItem>
            </RevealGroup>

            <Reveal delay={0.1}>
              <EventPoster event={event} priority />
            </Reveal>
          </div>
        </PageShell>
      </PageHero>

      <PageSection>
        <PageShell id="prizes" className="scroll-mt-24">
          <Reveal className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              What you can win
            </h2>
          </Reveal>

          <ol>
            {event.prizes.map((prize, index) => (
              <li key={prize.rank}>
                <Reveal className="grid items-center gap-6 border-b py-10 first:border-t lg:grid-cols-[6rem_1fr_1.1fr] lg:gap-10">
                  <span
                    aria-hidden="true"
                    className="text-6xl font-black leading-none text-transparent [-webkit-text-stroke:1.5px_var(--foreground)] lg:text-7xl"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {prize.rank}
                    </p>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                      {prize.name}
                    </h3>
                    <p className="mt-3 text-muted-foreground">
                      {prize.items.join("  +  ")}
                    </p>
                  </div>
                  <div className="relative aspect-368/198 overflow-hidden rounded-xl bg-black">
                    <Image
                      src={prize.image}
                      alt={prize.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 45vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </PageShell>
      </PageSection>

      <PageSection className="border-t">
        <PageShell>
          <Reveal className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
          </Reveal>
          <RevealGroup className="grid gap-x-10 md:grid-cols-3">
            {event.steps.map((step, index) => (
              <RevealItem key={step.title} className="border-t pt-6 pb-8 md:pb-0">
                <span className="text-xs font-semibold tabular-nums tracking-[0.2em] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-5xl font-black uppercase leading-none tracking-tight">
                  {step.title}.
                </h3>
                <p className="mt-4 max-w-xs text-muted-foreground">
                  {step.description}
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </PageShell>
      </PageSection>

      <PageSection className="border-t">
        <PageShell id="enter" className="max-w-3xl scroll-mt-24">
          <Reveal>
            {status === "open" && (
              <>
                <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
                  Enter now
                </h2>
                <div className="mt-8">
                  <GleamWidget campaignUrl={event.campaignUrl} title={event.title.toUpperCase()} />
                </div>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Entry form not loading?{" "}
                  <a
                    href={event.campaignUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Open the giveaway on Gleam
                  </a>
                  .
                </p>
              </>
            )}

            {status === "upcoming" && (
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Entries open soon
                </h2>
                <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                  {formatEventDates(event)}. The entry form appears here once
                  the giveaway opens.
                </p>
              </div>
            )}

            {status === "closed" && (
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  This giveaway has closed
                </h2>
                <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                  Thank you to everyone who joined. Follow our social channels
                  for the winner announcement and the next event.
                </p>
              </div>
            )}

            <div className="mt-12 flex flex-col items-center gap-4 border-t pt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Follow along
              </p>
              <ul className="flex flex-wrap justify-center gap-2.5">
                {socialLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      className="flex size-11 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-foreground/10 hover:text-foreground"
                    >
                      {link.icon}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </PageShell>
      </PageSection>

      <ProjectCta />
    </>
  );
}
