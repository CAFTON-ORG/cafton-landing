import type { Metadata } from "next";
import Image from "next/image";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Legal - CAFTON",
  description:
    "Legal information for Cafton Software Development Services, including registration details and terms of use.",
  alternates: { canonical: "/legal" },
};

export default function LegalPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
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
                Cafton Software Development Services is registered with the
                Department of Trade and Industry (DTI) under BNN 8436511
                (registered 21 Aug 2026) and with the Bureau of Internal
                Revenue (BIR) (registered 2 Sep 2026).
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.05}>
            <section>
              <h2 className="text-2xl font-semibold">Business Registration</h2>
              <p className="mt-3 text-muted-foreground">
                Cafton holds the following registrations with the Philippine
                government.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border p-5">
                  <p className="text-sm font-semibold">
                    DTI Business Name Registration
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Status: Registered
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    BNN 8436511 &middot; 21 Aug 2026
                  </p>
                </div>
                <div className="rounded-xl border p-5">
                  <p className="text-sm font-semibold">
                    BIR Certificate of Registration
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Status: Registered
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    RSN 008RC20260000010999 &middot; 2 Sep 2026
                  </p>
                  <div className="relative mt-3 aspect-3/1 w-full overflow-hidden rounded-lg border bg-white">
                    <Image
                      src="/bir-badge-seal.jpg"
                      alt="BIR Certificate of Registration seal"
                      fill
                      sizes="(min-width: 640px) 24rem, 100vw"
                      className="object-contain p-2"
                    />
                  </div>
                </div>
              </div>
            </section>
          </Reveal>

          <Reveal delay={0.1}>
            <section>
              <h2 className="text-2xl font-semibold">Terms of Use</h2>
              <p className="mt-3 text-muted-foreground">
                By accessing or using this website, you agree to these terms.
                If you do not agree with any part of them, please do not use
                this site.
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.14}>
            <section>
              <h2 className="text-2xl font-semibold">Use of This Website</h2>
              <p className="mt-3 text-muted-foreground">
                This website and its contents are provided for general
                information about Cafton and its services. You may browse and
                share pages normally, but you may not copy, reproduce, or
                redistribute any part of this site for commercial purposes
                without our written permission.
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.18}>
            <section>
              <h2 className="text-2xl font-semibold">Intellectual Property</h2>
              <p className="mt-3 text-muted-foreground">
                The Cafton name, logo, and the content of this website are the
                property of Cafton Software Development Services unless
                stated otherwise. Portfolio work shown belongs to the
                respective clients and is featured with their permission.
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.22}>
            <section>
              <h2 className="text-2xl font-semibold">
                Limitation of Liability
              </h2>
              <p className="mt-3 text-muted-foreground">
                This website is provided as is, without warranties of any
                kind. To the fullest extent permitted by law, Cafton is not
                liable for any loss or damage arising from your use of this
                site.
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.26}>
            <section>
              <h2 className="text-2xl font-semibold">Governing Law</h2>
              <p className="mt-3 text-muted-foreground">
                These terms are governed by the laws of the Republic of the
                Philippines.
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.3}>
            <section>
              <h2 className="text-2xl font-semibold">
                Changes to These Terms
              </h2>
              <p className="mt-3 text-muted-foreground">
                We may update this page from time to time as our registration
                details or business practices change. Continued use of this
                website after an update means you accept the revised terms.
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.34}>
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
