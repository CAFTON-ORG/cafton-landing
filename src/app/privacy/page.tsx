import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";

export default function PrivacyPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Privacy
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Privacy policy
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            How Cafton handles the information you share with us.
          </p>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell className="max-w-3xl space-y-8">
          <section>
            <h2 className="text-2xl font-semibold">Information we collect</h2>
            <p className="mt-3 text-muted-foreground">
              We collect information you choose to provide when you contact us,
              such as your name, email address, organization, and project
              details.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">How we use it</h2>
            <p className="mt-3 text-muted-foreground">
              We use this information to respond to your inquiry, discuss
              potential work, and improve how we communicate with you.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">Your choices</h2>
            <p className="mt-3 text-muted-foreground">
              You may ask us about, correct, or request deletion of your contact
              information by emailing contact@cafton.net.
            </p>
          </section>
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
