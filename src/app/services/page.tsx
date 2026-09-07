import type { Metadata } from "next";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { PillarGrid } from "@/components/services/pillar-grid";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Services - CAFTON",
  description:
    "Operations, growth, industry, and product-build systems, built around the way your organization actually works.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Software for the whole business, not just one corner of it.
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                Four areas we build in, each covering the systems that actually
                move a business forward. Pick the one closest to your problem
                and see what&apos;s inside.
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell>
          <RevealGroup>
            <PillarGrid />
          </RevealGroup>
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
