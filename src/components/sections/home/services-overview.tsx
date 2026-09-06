"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { PillarGrid } from "@/components/services/pillar-grid";

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
              From a focused internal tool to a full operating system for the
              business, we tailor the work to the problem.
            </p>
          </header>
        </Reveal>

        <RevealGroup className="mt-10 sm:mt-12">
          <PillarGrid compact />
        </RevealGroup>

        <Reveal delay={0.1}>
          <Link
            href="/services"
            className="group mt-8 inline-flex items-center text-sm font-medium text-foreground sm:mt-10"
          >
            View all services
            <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </PageShell>
    </section>
  );
}
