import type { Metadata } from "next";
import { pageSeo } from "@/features/cms/repository/seo";
import { Suspense } from "react";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/marketing/layout/page-shell";
import { ContactForm } from "@/components/marketing/contact/contact-form";
import { SystemGraphic } from "@/components/marketing/contact/system-graphic";
import { Faq } from "@/components/marketing/patterns/faq";
import { Button } from "@/components/ui/button";
import { Clock3, Mail } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { getDocument } from "@/features/cms/repository/documents";
import { getSiteSettings } from "@/features/cms/repository/site";

export async function generateMetadata(): Promise<Metadata> {
  return pageSeo("contact");
}

export default async function ContactPage() {
  const { email } = await getSiteSettings();
  const page = await getDocument("contact");
  return (
    <>
      <PageHero>
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
          <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-start">
            <Reveal className="flex flex-col gap-8">
              <div className="mx-auto aspect-square w-full max-w-80">
                <SystemGraphic />
              </div>
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Mail className="h-5 w-5 text-foreground" />
                  {page.email.heading}
                </h2>
                <p className="mt-3 text-muted-foreground">
                  {page.email.text}
                </p>
                <Button className="mt-4 cursor-pointer" asChild>
                  <a href={`mailto:${email}`}>{page.email.buttonLabel}</a>
                </Button>
              </div>

              <div className="border-t border-border pt-8">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Clock3 className="h-5 w-5 text-foreground" />
                  {page.expect.heading}
                </h2>
                <p className="mt-3 text-muted-foreground">
                  {page.expect.text}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {page.expect.note}
                </p>
              </div>
            </Reveal>
            <Reveal>
              <Suspense
                fallback={
                  <div
                    aria-hidden="true"
                    className="h-168 animate-pulse rounded-xl border bg-card"
                  />
                }
              >
                <ContactForm leadSource="Contact Us Page" pageName="Contact Us" />
              </Suspense>
            </Reveal>
          </div>
        </PageShell>
      </PageSection>
      <PageSection className="border-t border-border bg-muted/30">
        <PageShell className="max-w-3xl">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {page.faqHeading}
            </h2>
          </Reveal>
          <Reveal className="mt-8">
            <Faq />
          </Reveal>
        </PageShell>
      </PageSection>
    </>
  );
}
