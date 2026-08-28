"use client";

import { Cloud, Code2, MonitorSmartphone, Smartphone } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

const services = [
  {
    icon: Code2,
    title: "Custom Software",
    description:
      "Purpose-built systems designed around your organization's workflows.",
  },
  {
    icon: MonitorSmartphone,
    title: "Web Applications",
    description:
      "Platforms, dashboards, portals, and business systems accessible from the web.",
  },
  {
    icon: Smartphone,
    title: "Mobile Applications",
    description:
      "Mobile experiences for customers, employees, field teams, and communities.",
  },
  {
    icon: Cloud,
    title: "SaaS & Digital Products",
    description:
      "Scalable software products designed to solve recurring problems.",
  },
];

export function ServicesOverview() {
  return (
    <section id="services" className="relative overflow-hidden py-14 sm:py-16 ">
      <PageShell>
        <Reveal className="max-w-2xl">
          <header className="flex flex-col gap-4">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              What we build
            </h2>
            <p className="text-pretty text-base text-muted-foreground sm:text-lg">
              From a focused internal tool to a product used at scale, we tailor
              the work to the problem.
            </p>
          </header>
        </Reveal>

        <RevealGroup className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:mt-12 sm:grid-cols-2">
          {services.map(({ icon: Icon, title, description }) => (
            <RevealItem
              key={title}
              className="flex min-w-0 items-start gap-4 border-t border-border pt-6"
            >
              <Icon
                className="mt-0.5 size-5 shrink-0 text-foreground"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-1.5">
                <h3 className="text-base font-semibold text-foreground sm:text-lg">
                  {title}
                </h3>
                <p className="text-pretty text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </PageShell>
    </section>
  );
}
