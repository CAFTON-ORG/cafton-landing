import type { Metadata } from "next";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ImagePlaceholder } from "@/components/shared/image-placeholder";
import { LogoCarousel } from "@/components/shared/logo-carousel";
import { services } from "@/lib/services";

export const metadata: Metadata = {
  title: "About - CAFTON",
  description:
    "Cafton began with three collaborators who spent years engineering software together before turning that shared practice into a company.",
};

// Team profiles are intentionally hidden until we're ready to reveal them.
// const team = [
//   ["Christian", "Project leadership · Full-stack · Stakeholder communication"],
//   ["Averie", "Full-stack · Web & mobile · Geofencing"],
//   ["Felix", "Full-stack · Web & mobile · Database architecture"],
// ];

export default function About() {
  return (
    <>
      <PageHero>
        <PageShell>
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
        </PageShell>
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
            <h2 className="text-3xl font-bold">What we build</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              From a focused internal tool to a product used at scale, we tailor
              the work to the problem.
            </p>
          </Reveal>
          <RevealGroup className="mt-8 grid gap-x-8 gap-y-6 md:grid-cols-2">
            {services.map(({ icon: Icon, title, description }) => (
              <RevealItem
                key={title}
                className="flex items-start gap-4 border-t border-border pt-5"
              >
                <Icon
                  className="mt-0.5 size-5 shrink-0 text-foreground"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
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
