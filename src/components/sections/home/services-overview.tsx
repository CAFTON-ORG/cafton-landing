"use client";

import { Cloud, Code2, MonitorSmartphone, Smartphone } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Logo } from "@/components/shared/logo";
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
    <section
      id="services"
      className="relative overflow-hidden py-14 sm:py-16"
    >
      <PageShell>
        <div className="grid grid-cols-1 gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <Reveal>
              <header className="flex flex-col gap-4">
                <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  Why Choose Us
                </h2>
                <p className="text-pretty text-base text-muted-foreground sm:text-lg">
                  We deliver exceptional quality and service that sets us apart.
                  Experience the difference with our dedicated approach.
                </p>
              </header>
            </Reveal>

            <RevealGroup className="mt-8 flex flex-col divide-y divide-border sm:mt-10">
              {services.map(({ icon: Icon, title, description }) => (
                <RevealItem
                  key={title}
                  className="flex min-w-0 items-start gap-4 py-5 first:pt-0"
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
          </div>
          <div className="hidden items-center justify-center lg:flex">
            <Logo
              aria-hidden="true"
              className="h-72 w-auto text-foreground/[0.07] xl:h-[26rem]"
            />
          </div>
        </div>
      </PageShell>
    </section>
  );
}
