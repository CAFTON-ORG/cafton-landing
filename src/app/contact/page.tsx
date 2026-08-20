import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ContactForm } from "@/components/shared/contact-form";

export default function ContactPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Contact
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Have a problem worth solving?
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Tell us what you&apos;re building, what isn&apos;t working, or what
            you&apos;d like to improve.
          </p>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell className="max-w-3xl">
          <ContactForm leadSource="Contact Us Page" pageName="Contact Us" />
        </PageShell>
      </PageSection>
    </>
  );
}
