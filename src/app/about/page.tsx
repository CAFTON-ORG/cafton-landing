import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ImagePlaceholder } from "@/components/shared/image-placeholder";
import { LogoCarousel } from "@/components/shared/logo-carousel";
import { servicePillars } from "@/lib/services";

export const metadata: Metadata = {
  title: "About - CAFTON",
  description:
    "Cafton began with three collaborators who spent years engineering software together before turning that shared practice into a company.",
};

export default function About() {
  return (
    <>
      <PageHero
        image={
          <div className="group relative h-full w-full overflow-hidden rounded-xl border">
            <Image
              src="/cafton-team.png"
              alt="The Cafton team"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
              priority
            />
          </div>
        }
      >
        <RevealGroup>
          <RevealItem>
            <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
              Three teammates, building technology with purpose.
            </h1>
          </RevealItem>
          <RevealItem>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Cafton began with three collaborators who spent years
              engineering software together before turning that shared
              practice into a company.
            </p>
          </RevealItem>
        </RevealGroup>
      </PageHero>
      <PageSection>
        <PageShell className="grid gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl font-bold">What we believe</h2>
            <p className="mt-5 text-lg text-muted-foreground">
              We don&apos;t start with software. We start with the problem: how
              people work today and what could work better tomorrow.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="text-3xl font-bold">How we work</h2>
            <p className="mt-5 text-muted-foreground">
              Understand → Design → Engineer → Deploy → Improve. Clear thinking
              and close collaboration guide every stage.
            </p>
          </Reveal>
        </PageShell>
      </PageSection>
      <section id="services" className="py-14 sm:py-16 lg:py-20">
        <PageShell>
          <Reveal>
            <h2 className="text-3xl font-bold">Where we can help</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Four areas we build in, from the back office to a product that
              doesn&apos;t exist yet.
            </p>
          </Reveal>
          <RevealGroup className="mt-8 flex flex-col">
            {servicePillars.map(({ icon: Icon, title, tagline, slug }) => (
              <RevealItem
                key={slug}
                className="border-t border-border py-5 first:border-t-0 first:pt-0"
              >
                <Link
                  href={`/services/${slug}`}
                  className="group flex items-start gap-4"
                >
                  <Icon
                    className="mt-0.5 size-5 shrink-0 text-foreground"
                    aria-hidden="true"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold transition-colors group-hover:text-muted-foreground">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {tagline}
                    </p>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
          <Reveal delay={0.1}>
            <Link
              href="/services"
              className="group mt-8 inline-flex items-center text-sm font-medium text-foreground"
            >
              View all services
              <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </PageShell>
      </section>
      {/*
        Team profiles intentionally hidden until we're ready to reveal them.
        Uncomment (and the `team` array + `ImagePlaceholder` import above)
        when that content is ready.
        <PageSection className="bg-muted/30">
          <PageShell>
            <Reveal>
              <h2 className="text-3xl font-bold">Our team</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Three founders who worked together for years before Cafton
                existed -- not a team assembled for a project.
              </p>
            </Reveal>
            <RevealGroup className="mt-10 grid gap-6 sm:grid-cols-3">
              {team.map(([name, role]) => (
                <RevealItem key={name} className="flex flex-col items-center text-center">
                  <ImagePlaceholder
                    className="aspect-square w-32 rounded-full"
                    label={`${name}'s photo`}
                    icon={Users2}
                  />
                  <h3 className="mt-4 text-lg font-semibold">{name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{role}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </PageShell>
        </PageSection>
      */}
      {/* <PageSection className="bg-muted/30">
        <PageShell>
          <Reveal>
            <h2 className="text-3xl font-bold">Our partners</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Organizations we&apos;ve built with and for.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <LogoCarousel />
          </Reveal>
        </PageShell>
      </PageSection> */}
      <ProjectCta />
    </>
  );
}
