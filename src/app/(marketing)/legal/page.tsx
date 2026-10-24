import type { Metadata } from "next";
import { pageSeo } from "@/features/cms/repository/seo";
import Image from "next/image";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/marketing/layout/page-shell";
import { DocumentLayout, slugify } from "@/components/marketing/patterns/document-layout";
import { RichText } from "@/components/marketing/patterns/rich-text";
import { ProjectCta } from "@/components/marketing/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/motion/reveal";
import { Badge } from "@/components/ui/badge";

import { getDocument } from "@/features/cms/repository/documents";
import { getSiteSettings } from "@/features/cms/repository/site";

export async function generateMetadata(): Promise<Metadata> {
  return pageSeo("legal");
}

export default async function LegalPage() {
  const [{ email, city, country }, page] = await Promise.all([
    getSiteSettings(),
    getDocument("legal"),
  ]);
  const toc = page.sections.map((section) => ({
    id: section.id || slugify(section.title),
    title: section.title,
  }));

  const registrations = (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {page.registrations.map((registration) => (
        <div
          key={registration.name}
          className="rounded-xl border bg-card p-5 shadow-sm dark:bg-transparent dark:shadow-none"
        >
          <p className="text-sm font-semibold">{registration.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">Status: {registration.status}</p>
          <p className="mt-1 text-sm text-muted-foreground">{registration.detail}</p>
          {registration.image && (
            <div className="relative mt-3 aspect-3/1 w-full overflow-hidden rounded-lg border bg-white">
              <Image
                src={registration.image}
                alt={registration.imageAlt}
                fill
                sizes="(min-width: 640px) 24rem, 100vw"
                className="object-contain p-2"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );

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
          </RevealGroup>
        </PageShell>
      </PageHero>
      <PageSection>
        <DocumentLayout toc={toc} className="space-y-8">
          {page.sections.map((section) => (
            <Reveal key={section.title}>
              <section id={section.id || slugify(section.title)} className="scroll-mt-24">
                <h2 className="text-2xl font-semibold">{section.title}</h2>
                <RichText
                  text={section.body}
                  vars={{ email, city, country }}
                  blocks={{ registrations }}
                  paragraphClassName="mt-3 text-muted-foreground"
                />
              </section>
            </Reveal>
          ))}
        </DocumentLayout>
      </PageSection>
      <ProjectCta />
    </>
  );
}
