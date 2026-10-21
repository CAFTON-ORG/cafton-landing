import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { ServiceIndex } from "@/components/services/service-index";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = pageMetadata({
  title: "Services",
  description:
    "Business operations, growth, industry, and new-product software, built around the way your organization actually works.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <PageHero variant="compact">
        <PageShell>
          <RevealGroup>
            <RevealItem className="mb-4">
              <Badge variant="outline" className="px-3 py-1 text-sm">Services</Badge>
            </RevealItem>
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
          <ServiceIndex />
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
