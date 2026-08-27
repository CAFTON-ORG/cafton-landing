import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

export default function CareersPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Careers
              </p>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Build useful things with us.
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
