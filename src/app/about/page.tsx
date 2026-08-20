import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";

const team = [
  ["Christian", "Project leadership · Full-stack · Stakeholder communication"],
  ["Averie", "Full-stack · Web & mobile · Geofencing"],
  ["Felix", "Full-stack · Web & mobile · Database architecture"],
];

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
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            About Cafton
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Three teammates, building technology with purpose.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Cafton began with three collaborators who spent years engineering
            software together before turning that shared practice into a
            company.
          </p>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">What we believe</h2>
            <p className="mt-5 text-lg text-muted-foreground">
              We don&apos;t start with software. We start with the problem—how
              people work today and what could work better tomorrow.
            </p>
          </div>
          <div>
            <h2 className="text-3xl font-bold">How we work</h2>
            <p className="mt-5 text-muted-foreground">
              Understand → Design → Engineer → Deploy → Improve. Clear thinking
              and close collaboration guide every stage.
            </p>
          </div>
        </PageShell>
      </PageSection>
      <section id="services" className="py-14 sm:py-16 lg:py-20">
        <PageShell>
          <h2 className="text-3xl font-bold">What we build</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            From a focused internal tool to a product used at scale, we tailor
            the work to the problem.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {services.map(([title, description]) => (
              <article key={title} className="rounded-xl border bg-card p-6">
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </PageShell>
      </section>
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
          <p className="mt-12 max-w-2xl text-muted-foreground">
            Our direction is simple: partner with organizations that want
            practical, resilient technology to move forward.
          </p>
          <Button asChild className="mt-6">
            <Link href="/contact">Start a conversation</Link>
          </Button>
        </PageShell>
      </PageSection>
    </>
  );
}
