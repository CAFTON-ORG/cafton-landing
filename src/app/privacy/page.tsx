import type { Metadata } from "next";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Privacy Policy - CAFTON",
  description: "How Cafton handles the information you share with us.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Privacy policy
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                How Cafton handles the information you share with us.
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell className="max-w-3xl space-y-8">
          <Reveal>
            <section>
              <h2 className="text-2xl font-semibold">Information we collect</h2>
              <p className="mt-3 text-muted-foreground">
                We collect information you choose to provide when you contact us,
                such as your name, email address, organization, and project
                details.
              </p>
            </section>
          </Reveal>
          <Reveal delay={0.06}>
            <section>
              <h2 className="text-2xl font-semibold">How we use it</h2>
              <p className="mt-3 text-muted-foreground">
                We use this information to respond to your inquiry, discuss
                potential work, and improve how we communicate with you.
              </p>
            </section>
          </Reveal>
          <Reveal delay={0.12}>
            <section>
              <h2 className="text-2xl font-semibold">Your choices</h2>
              <p className="mt-3 text-muted-foreground">
                You may ask us about, correct, or request deletion of your contact
                information by emailing contact@cafton.com.
              </p>
            </section>
          </Reveal>
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
