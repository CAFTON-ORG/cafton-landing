"use client";

import { Cloud, Code2, MonitorSmartphone, Smartphone } from "lucide-react";
import { Image3D } from "@/components/shared/image-3d";
import { PageSection, PageShell } from "@/components/layout/page-shell";

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
    <section className="relative py-14 sm:py-16 ">
      <PageShell>
        <div className="grid grid-cols-1 gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <header className="flex flex-col gap-4">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Why Choose Us
              </h2>
              <p className="text-pretty text-base text-muted-foreground sm:text-lg">
                We deliver exceptional quality and service that sets us apart.
                Experience the difference with our dedicated approach.
              </p>
            </header>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:gap-5 lg:grid-cols-2 lg:gap-6">
              {services.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="group flex min-w-0 flex-col items-start gap-4 rounded-xl border bg-card p-5 sm:p-6"
                >
                  <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-base font-semibold text-foreground sm:text-lg">
                      {title}
                    </h3>
                    <p className="text-balance text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Image3D
            lightSrc="/cafton-light.png"
            darkSrc="/cafton-dark.png"
            alt="Performance dashboard"
            direction="right"
            className="order-1 lg:order-2"
          />
        </div>
      </PageShell>
    </section>
  );
}
