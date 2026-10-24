import type { Metadata } from "next";
import { pageSeo } from "@/features/cms/repository/seo";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/marketing/layout/page-shell";
import { ProjectCta } from "@/components/marketing/home/project-cta";
import { RevealGroup, RevealItem } from "@/components/marketing/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { CookieTable } from "@/components/marketing/privacy/cookie-table";
import { DocumentLayout, slugify } from "@/components/marketing/patterns/document-layout";
import { RichText } from "@/components/marketing/patterns/rich-text";
import { PolicySection } from "@/components/marketing/privacy/policy-section";
import { CookieSettingsButton } from "@/components/marketing/consent/cookie-settings-button";
import { getDocument } from "@/features/cms/repository/documents";
import { getSiteSettings } from "@/features/cms/repository/site";

export async function generateMetadata(): Promise<Metadata> {
  return pageSeo("privacy");
}

export default async function PrivacyPage() {
  const [{ email, city, country }, policy] = await Promise.all([
    getSiteSettings(),
    getDocument("privacy"),
  ]);
  const toc = policy.sections.map((section) => ({
    id: section.id || slugify(section.title),
    title: section.title,
  }));

  return (
    <>
      <PageHero variant="compact">
        <PageShell>
          <RevealGroup>
            <RevealItem className="mb-4">
              <Badge variant="outline" className="px-3 py-1 text-sm">{policy.eyebrow}</Badge>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                {policy.heading}
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                {`${policy.intro} Last updated ${policy.lastUpdated}.`}
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>

      <PageSection>
        <DocumentLayout toc={toc} className="space-y-10">
          {policy.sections.map((section) => (
            <PolicySection key={section.title} id={section.id || undefined} title={section.title}>
              <RichText
                text={section.body}
                vars={{ email, city, country }}
                inline={{
                  "cookie-settings": (
                    <CookieSettingsButton className="cursor-pointer font-medium text-foreground underline underline-offset-4" />
                  ),
                }}
                blocks={{ "cookie-table": <CookieTable /> }}
              />
            </PolicySection>
          ))}
        </DocumentLayout>
      </PageSection>
      <ProjectCta />
    </>
  );
}
