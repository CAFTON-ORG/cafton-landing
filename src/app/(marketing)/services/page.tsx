import { getDocument } from "@/features/cms/repository/documents";
import type { Metadata } from "next";
import { pageSeo } from "@/features/cms/repository/seo";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/marketing/layout/page-shell";
import { ProjectCta } from "@/components/marketing/home/project-cta";
import { ServiceIndex } from "@/components/marketing/services/service-index";
import { RevealGroup, RevealItem } from "@/components/marketing/motion/reveal";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata(): Promise<Metadata> {
  return pageSeo("services");
}

export default async function ServicesPage() {
  const page = await getDocument("services");
  return (
    <>
      <PageHero variant="compact">
        <PageShell>
          <RevealGroup>
            <RevealItem className="mb-4">
              <Badge variant="outline" className="px-3 py-1 text-sm">{page.eyebrow}</Badge>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                {page.heading}
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                {page.intro}
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
