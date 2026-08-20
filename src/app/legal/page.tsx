import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";

export default function LegalPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Legal
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Terms of use
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            The terms that apply when using this website.
          </p>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell className="max-w-3xl space-y-8">
          <section>
            <h2 className="text-2xl font-semibold">Website content</h2>
            <p className="mt-3 text-muted-foreground">
              The content on this website is provided for general information
              and may change without notice.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">Intellectual property</h2>
            <p className="mt-3 text-muted-foreground">
              Cafton&apos;s name, branding, and original website content may not
              be used without permission.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">Contact</h2>
            <p className="mt-3 text-muted-foreground">
              For questions about these terms, contact us at contact@cafton.net.
            </p>
          </section>
        </PageShell>
      </PageSection>
    </>
  );
}
