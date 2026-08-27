import type { Metadata } from "next";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "About - CAFTON",
  description:
    "Cafton began with three collaborators who spent years engineering software together before turning that shared practice into a company.",
};

// Team profiles are intentionally hidden until their content is finalized.
// const team = [
//   ["Christian", "Project leadership · Full-stack · Stakeholder communication"],
//   ["Averie", "Full-stack · Web & mobile · Geofencing"],
//   ["Felix", "Full-stack · Web & mobile · Database architecture"],
// ];

const services = [
  [
    "Custom Software",
    "Purpose-built systems designed around your organization's workflows.",
  ],
  [
    "Web Applications",
    "Platforms, dashboards, portals, and business systems accessible from the web.",
  ],
  [
    "Mobile Applications",
    "Mobile experiences for customers, employees, field teams, and communities.",
  ],
  [
    "SaaS & Digital Products",
    "Scalable software products designed to solve recurring problems.",
  ],
];

export default function About() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                Three teammates, building technology with purpose.
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                Cafton began with three collaborators who spent years engineering
                software together before turning that shared practice into a
                company.
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
              We don&apos;t start with software. We start with the problem:
              how people work today and what could work better tomorrow.
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
            {services.map(([title, description]) => (
              <RevealItem key={title} className="border-t border-border pt-5">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {description}
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </PageShell>
      </section>
      <ProjectCta />
      {/*
        <PageSection className="bg-muted/30">
          <PageShell>
            <h2 className="text-3xl font-bold">Our team</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {team.map(([name, role]) => (
                <article key={name} className="rounded-xl border bg-card p-6">
                  <h3 className="text-xl font-semibold">{name}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{role}</p>
                </article>
              ))}
            </div>
          </PageShell>
        </PageSection>
      */}
    </>
  );
}
