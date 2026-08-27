import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

export default function LegalPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Legal
              </p>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Legal Information
              </h1>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell className="max-w-3xl space-y-8">
          <Reveal>
            <section>
              <h2 className="text-2xl font-semibold">Company Information</h2>
              <p className="mt-3 text-muted-foreground">
                Cafton Software Development Services was registered on 21 Aug
                2026 with BNN 8436511. Its current status is DTI-Registered.
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.08}>
            <section>
              <h2 className="text-2xl font-semibold">Contact</h2>
              <p className="mt-3 text-muted-foreground">
                For questions about these terms, contact us at
                contact@cafton.com.
              </p>
            </section>
          </Reveal>
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
