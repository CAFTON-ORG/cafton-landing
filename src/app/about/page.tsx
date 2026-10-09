import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { DotPattern } from "@/components/shared/dot-pattern";
import { ProcessGraphic } from "@/components/about/process-graphic";
import { TeamPhoto } from "@/components/about/team-photo";
import { PartnersSection } from "@/components/sections/partners";
import { servicePillars } from "@/lib/services";
import { coreValues as values } from "@/lib/values";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "Cafton is a software development company in Baguio City helping businesses and organizations solve real problems with practical digital solutions.",
  path: "/about",
});

const facts = ["Est. 2026", "Baguio City", "Remote, nationwide"];

const specialties = [
  "Customized software systems",
  "Web applications",
  "Mobile applications",
  "Digital platforms",
];

const chapters = [
  {
    label: "The spark",
    text: "Cafton began with a shared interest in software engineering and a common goal: to use technology to solve real-world problems.",
  },
  {
    label: "Baguio City, 2026",
    text: "It was built on the idea that businesses of different sizes should have access to digital solutions suited to their needs.",
  },
  {
    label: "From vision to practice",
    text: "What started as a shared vision has grown into a business focused on helping clients turn ideas into functional systems and everyday challenges into opportunities for improvement.",
  },
  {
    label: "Today",
    text: "We keep building our foundation through client projects, collaboration, and new software products that can benefit businesses and communities.",
  },
];

// Filled with the page colour (stroke painted first) so the overlapping
// contours of the variable font don't show as lines inside the glyphs.
const OUTLINE =
  "text-background [-webkit-text-stroke:1.5px_var(--foreground)] [paint-order:stroke]";

export default function About() {
  return (
    <>
      {/* 1. Hero */}
      <PageHero image={<TeamPhoto />}>
        <RevealGroup>
          <RevealItem className="mb-4">
            <Badge variant="outline" className="px-3 py-1 text-sm">About</Badge>
          </RevealItem>
          <RevealItem>
            <h1 className="max-w-xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Technology should make work{" "}
              <span className="underline decoration-foreground/30 decoration-2 underline-offset-8">
                easier
              </span>
              , not more complicated.
            </h1>
          </RevealItem>
          <RevealItem>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Cafton is a software development company in Baguio City. We help
              businesses, organizations, and emerging ventures improve their
              operations and serve their customers through practical digital
              solutions.
            </p>
          </RevealItem>
          <RevealItem>
            <ul className="mt-8 inline-flex flex-wrap border-y text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {facts.map((fact) => (
                <li key={fact} className="border-r py-3 pr-5 last:border-r-0 [&:not(:first-child)]:pl-5">
                  {fact}
                </li>
              ))}
            </ul>
          </RevealItem>
        </RevealGroup>
      </PageHero>

      {/* 2. What we do */}
      <PageSection>
        <PageShell>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                What we do
              </p>
              <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
                Practical software, built around the problem.
              </h2>
            </Reveal>
            <Reveal className="space-y-4 text-lg leading-relaxed text-muted-foreground lg:pt-9">
              <p>
                We take time to understand the challenges our clients face, then
                build solutions that help them manage their processes, reduce
                manual work, organize information, and improve efficiency.
              </p>
              <p>
                From improving an existing process to developing a completely
                new platform, we aim to deliver solutions that are useful,
                reliable, and built for long-term value.
              </p>
            </Reveal>
          </div>

          <RevealGroup className="mt-14 border-b">
            {specialties.map((item, index) => (
              <RevealItem key={item} className="group border-t">
                <div className="flex items-center gap-5 py-5 transition-transform duration-300 ease-out group-hover:translate-x-3 sm:gap-8 sm:py-7">
                  <span className="text-xs font-semibold tabular-nums tracking-[0.2em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-2xl font-bold tracking-tight sm:text-4xl">
                    {item}
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-6 -translate-x-2 translate-y-2 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 sm:size-8"
                  />
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </PageShell>
      </PageSection>

      {/* 3. Story */}
      <PageSection className="border-t">
        <PageShell className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Our story
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Where the name comes from.
            </h2>

            <div aria-label="CAF plus TON makes CAFTON" className="mt-10 flex items-start gap-3 sm:gap-5">
              <div>
                <div
                  aria-hidden="true"
                  className="flex font-black uppercase leading-none tracking-tight text-[clamp(3.75rem,13vw,7rem)]"
                >
                  {["C", "A", "F"].map((letter) => (
                    <span
                      key={letter}
                      className="inline-block transition-transform duration-300 ease-out hover:-translate-y-2"
                    >
                      {letter}
                    </span>
                  ))}
                </div>
                <p className="mt-3 border-t border-dashed pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Three founders
                </p>
              </div>
              <span
                aria-hidden="true"
                className="pt-[0.1em] text-[clamp(2rem,6vw,3.5rem)] font-light leading-none text-muted-foreground/60"
              >
                +
              </span>
              <div>
                <div
                  aria-hidden="true"
                  className={`inline-block font-black uppercase leading-none tracking-tight text-[clamp(3.75rem,13vw,7rem)] ${OUTLINE}`}
                >
                  TON
                </div>
                <p className="mt-3 border-t border-dashed pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  One identity
                </p>
              </div>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-6 text-muted-foreground">
              CAF is the first letters of our three founders&apos; names. TON
              completes it into a name that is distinct and easy to remember.
            </p>
          </Reveal>

          <RevealGroup>
            <ol className="relative border-l pl-8 sm:pl-10">
              {chapters.map((chapter, index) => (
                <RevealItem as="li" key={chapter.label} className="relative pb-12 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[2.4rem] top-1 size-3 rounded-full border-2 border-foreground bg-background sm:-left-[2.9rem]"
                  />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                    {" · "}
                    {chapter.label}
                  </p>
                  <p className="mt-3 text-lg leading-relaxed sm:text-xl">{chapter.text}</p>
                </RevealItem>
              ))}
            </ol>
          </RevealGroup>
        </PageShell>
      </PageSection>

      {/* 4. Vision, mission, goal */}
      <section className="relative overflow-hidden border-y bg-muted/30 py-20 sm:py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0">
          <DotPattern size="md" fadeStyle="ellipse" opacity="low" />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_0%,color-mix(in_oklch,var(--foreground)_9%,transparent)_0%,transparent_55%)]"
        />
        <PageShell className="relative">
          <Reveal className="relative max-w-5xl">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-2 -top-16 select-none text-[12rem] font-black leading-none text-foreground/[0.07] sm:-left-6 sm:-top-24 sm:text-[18rem]"
            >
              &ldquo;
            </span>
            <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Our vision
            </p>
            <p className="relative mt-5 text-balance text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              To become a trusted technology company that transforms ideas and
              real-world challenges into innovative digital solutions that
              create lasting value for businesses and communities.
            </p>
          </Reveal>

          <RevealGroup className="mt-16 grid gap-12 md:grid-cols-2 md:gap-16 lg:mt-24">
            {[
              {
                initial: "M",
                label: "Our mission",
                text: "To help businesses, organizations, and emerging ventures solve real-world challenges through reliable, user-centered, and innovative digital solutions, combining software engineering and collaborative development to turn ideas into practical products.",
              },
              {
                initial: "G",
                label: "Our goal",
                text: "To establish Cafton as a sustainable software development company that delivers practical and innovative solutions while building long-term client relationships, developing its own products, and contributing to the digital transformation of businesses and communities.",
              },
            ].map((item) => (
              <RevealItem key={item.label} className="grid grid-cols-[auto_1fr] gap-6 border-t pt-6">
                <span
                  aria-hidden="true"
                  className={`text-7xl font-black leading-none sm:text-8xl ${OUTLINE}`}
                >
                  {item.initial}
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-3 text-lg leading-relaxed">{item.text}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </PageShell>
      </section>

      {/* 5. Values */}
      <PageSection>
        <PageShell className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-24">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Core values
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              What guides our work.
            </h2>
            <p className="mt-5 max-w-sm text-muted-foreground">
              Six commitments we hold ourselves to, on every project and in
              every conversation.
            </p>
          </Reveal>
          <RevealGroup>
            <ol className="border-b">
              {values.map((value, index) => (
                <RevealItem as="li" key={value.title} className="group border-t">
                  <div className="grid gap-x-8 gap-y-2 py-7 sm:grid-cols-[5rem_1fr] sm:py-9">
                    <span
                      aria-hidden="true"
                      className={`text-5xl font-black leading-none tabular-nums transition-colors duration-300 group-hover:text-foreground sm:text-6xl ${OUTLINE}`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight">{value.title}</h3>
                      <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
                        {value.description}
                      </p>
                    </div>
                  </div>
                </RevealItem>
              ))}
            </ol>
          </RevealGroup>
        </PageShell>
      </PageSection>

      {/* 6. How we work */}
      <PageSection className="overflow-hidden border-t">
        <PageShell>
          <Reveal className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Our approach
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              How we work.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              It starts with the problem: how people work today and what could
              work better tomorrow. Clear thinking and close collaboration
              guide every stage.
            </p>
          </Reveal>
          <Reveal>
            <ProcessGraphic />
          </Reveal>
          <Reveal>
            <p
              aria-hidden="true"
              className={`mt-20 select-none text-center text-[clamp(2.25rem,8.5vw,7rem)] font-black uppercase leading-[0.92] tracking-tight opacity-40 ${OUTLINE}`}
            >
              Build Better.
              <br />
              Solve Smarter.
            </p>
          </Reveal>
        </PageShell>
      </PageSection>

      {/* 7. Partners and sponsorships */}
      <PartnersSection />

      {/* 8. Where we can help */}
      <section id="services" className="border-t py-14 sm:py-16 lg:py-20">
        <PageShell>
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
                Where we can help.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Four areas we build in, from the back office to a product that
                doesn&apos;t exist yet.
              </p>
            </div>
            <Link
              href="/services"
              className="group inline-flex items-center text-sm font-medium text-foreground"
            >
              View all services
              <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
          <RevealGroup className="grid sm:grid-cols-2 sm:gap-x-12">
            {servicePillars.map(({ icon: Icon, title, tagline, slug }, index) => (
              <RevealItem key={slug} className="border-t">
                <Link
                  href={`/services/${slug}`}
                  className="group relative block overflow-hidden py-9 pr-20 outline-none focus-visible:bg-muted/40"
                >
                  <Icon
                    strokeWidth={1}
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-3 -right-3 size-36 text-foreground/[0.07] transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-110"
                  />
                  <span className="text-xs font-semibold tabular-nums tracking-[0.2em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-2xl font-bold tracking-tight transition-transform duration-300 group-hover:translate-x-2">
                    {title}
                  </h3>
                  <p className="mt-2 max-w-sm text-muted-foreground">{tagline}</p>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="absolute right-0 top-9 size-6 text-muted-foreground transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-foreground"
                  />
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        </PageShell>
      </section>

      <ProjectCta />
    </>
  );
}
