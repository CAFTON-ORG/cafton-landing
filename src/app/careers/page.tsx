import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = pageMetadata({
  title: "Careers",
  description:
    "We are always interested in meeting thoughtful people who care about practical, well-made technology.",
  path: "/careers",
  // No open roles yet: a thin page that would only be reported as
  // "crawled, not indexed". Remove this flag (and re-add it to the sitemap)
  // when there are roles to list.
  noindex: true,
});

export default function CareersPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem className="mb-4">
              <Badge variant="outline" className="px-3 py-1 text-sm">Careers</Badge>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Build software that actually gets used.
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                We&apos;re always interested in meeting thoughtful people who care
                about practical, well-made technology.
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell className="max-w-3xl">
          <Reveal>
            <h2 className="text-2xl font-semibold">No open roles right now</h2>
            <p className="mt-3 text-muted-foreground">
              If you&apos;d like to introduce yourself, send us a short note with
              your work or portfolio.
            </p>
            <Button asChild className="mt-6 cursor-pointer">
              <Link href="mailto:contact@cafton.com?subject=Careers%20at%20Cafton">
                Introduce yourself
              </Link>
            </Button>
          </Reveal>
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
