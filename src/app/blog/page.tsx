import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

export default function Blog() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Insights
              </p>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Notes from Cafton.
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">Thoughts on building useful technology, coming soon.</p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell>
          <Reveal>
            <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-14 text-center">
              <h2 className="text-2xl font-semibold">No posts yet.</h2>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">We&apos;re preparing the first notes from Cafton. Please check back soon.</p>
            </div>
          </Reveal>
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
