import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Cafton collects, uses, and protects your personal information, and how we use cookies, under the Data Privacy Act of 2012.",
  path: "/privacy",
});

const LAST_UPDATED = "9 October 2026";

const cookies = [
  {
    name: "cafton_consent",
    provider: "Cafton",
    purpose: "Remembers the cookie choice you made, so we don't ask again on every page.",
    duration: "6 months",
    type: "Strictly necessary",
  },
  {
    name: "cafton-theme",
    provider: "Cafton (browser local storage)",
    purpose: "Remembers your light or dark preference. It is only saved if you use the theme toggle.",
    duration: "Until you clear it",
    type: "Strictly necessary",
  },
  {
    name: "Cloudflare Turnstile",
    provider: "Cloudflare",
    purpose:
      "Checks that a person, not a bot, is sending the contact form. Cloudflare may use cookies or browser storage while it does.",
    duration: "As set by Cloudflare",
    type: "Strictly necessary",
  },
  {
    name: "Gleam entry form",
    provider: "Gleam",
    purpose:
      "The giveaway entry form on our events pages. It loads only if you allow embedded content, and Gleam sets its own cookies.",
    duration: "As set by Gleam",
    type: "Optional (your consent)",
  },
];

const rights = [
  "Be informed about how your personal data is processed.",
  "Access the personal data we hold about you.",
  "Correct data that is inaccurate or out of date.",
  "Object to processing, or ask us to suspend, remove, or block your data.",
  "Receive your data in a structured, commonly used format.",
  "Withdraw consent you have given, at any time.",
  "Be compensated for damages from inaccurate, incomplete, outdated, false, unlawfully obtained, or unauthorized use of your data.",
];

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <section id={id} className="scroll-mt-24 border-t pt-8">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <div className="mt-4 space-y-4 leading-relaxed text-muted-foreground">{children}</div>
      </section>
    </Reveal>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem className="mb-4">
              <Badge variant="outline" className="px-3 py-1 text-sm">Privacy</Badge>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Privacy policy
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                How Cafton collects, uses, and protects your personal
                information, and how this website uses cookies. Last updated{" "}
                {LAST_UPDATED}.
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>

      <PageSection>
        <PageShell className="max-w-3xl space-y-10">
          <Section title="Who we are">
            <p>
              This website is run by Cafton Software Development Services
              (&ldquo;Cafton&rdquo;), based in Baguio City, Philippines. We are
              the personal information controller for the information described
              here, and we process it in line with the Data Privacy Act of 2012
              (Republic Act No. 10173). You can reach us at{" "}
              <a
                href="mailto:contact@cafton.com"
                className="font-medium text-foreground underline underline-offset-4"
              >
                contact@cafton.com
              </a>
              .
            </p>
          </Section>

          <Section title="Information we collect">
            <p>
              <strong className="font-semibold text-foreground">
                What you give us.
              </strong>{" "}
              When you use the contact form we collect your name, email address,
              and phone number, and whatever you choose to tell us about your
              project: what it is for, your business and role, its size and how
              long it has operated, your office address if you give one, the
              challenges and systems you are interested in, your budget and
              timeline, how you heard about us, and any notes. If you email us,
              we keep that correspondence.
            </p>
            <p>
              <strong className="font-semibold text-foreground">
                What is collected automatically.
              </strong>{" "}
              Our hosting and security providers process technical data, such as
              your IP address and browser details, to deliver the site and
              protect it. The contact form also uses your IP address, briefly
              and in memory, to limit abuse, and shares it with Cloudflare for
              its bot check. We do not run analytics or advertising trackers.
            </p>
          </Section>

          <Section title="How we use it">
            <p>
              We use your inquiry to reply to you, discuss and scope possible
              work, and keep reasonable records of our business dealings. We use
              technical data to keep the site secure and working. We do not sell
              your personal information or use it for advertising.
            </p>
            <p>
              We rely on your consent, which you give by submitting the form,
              and on our legitimate interest in running and securing this
              website.
            </p>
          </Section>

          <Section title="Who we share it with">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="font-semibold text-foreground">HubSpot</strong>
                , which stores contact form submissions for us as a customer
                relationship tool.
              </li>
              <li>
                <strong className="font-semibold text-foreground">Cloudflare</strong>
                , which provides the Turnstile bot check on the contact form.
              </li>
              <li>
                <strong className="font-semibold text-foreground">
                  Our hosting provider
                </strong>
                , which serves the website.
              </li>
              <li>
                <strong className="font-semibold text-foreground">Gleam</strong>
                , only if you choose to load a giveaway entry form. Gleam then
                collects what you enter on its own terms.
              </li>
            </ul>
            <p>
              Some of these providers process data outside the Philippines. We
              only use providers that we trust to protect it, and we share
              nothing beyond what each needs to do its job.
            </p>
          </Section>

          <Section id="cookies" title="Cookies and similar technologies">
            <p>
              Cookies are small files a site stores in your browser. We keep
              them to the minimum. Strictly necessary items work without your
              consent; anything optional stays off until you allow it. You can
              change your choice at any time:{" "}
              <CookieSettingsButton className="cursor-pointer font-medium text-foreground underline underline-offset-4" />
              .
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 border-collapse text-left text-sm">
                <caption className="sr-only">Cookies and storage used by this website</caption>
                <thead>
                  <tr className="border-b text-foreground">
                    <th scope="col" className="py-3 pr-4 font-semibold">Name</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Provider</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Purpose</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Duration</th>
                    <th scope="col" className="py-3 font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {cookies.map((cookie) => (
                    <tr key={cookie.name} className="border-b align-top">
                      <th scope="row" className="py-3 pr-4 font-medium text-foreground">
                        {cookie.name}
                      </th>
                      <td className="py-3 pr-4">{cookie.provider}</td>
                      <td className="py-3 pr-4">{cookie.purpose}</td>
                      <td className="py-3 pr-4">{cookie.duration}</td>
                      <td className="py-3">{cookie.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              We do not use analytics, advertising, or cross-site tracking
              cookies. Most browsers also let you block or delete cookies in
              their settings, though parts of a site may then stop working.
            </p>
          </Section>

          <Section title="How long we keep it">
            <p>
              We keep inquiry details for as long as we need them to respond and
              to keep reasonable business records, then delete or anonymize
              them. You can ask us to delete your information sooner at any
              time.
            </p>
          </Section>

          <Section title="How we protect it">
            <p>
              The site is served over HTTPS, the contact form is protected
              against spam and bots, and access to what you send us is limited
              to the people who need it to respond. No system is perfectly
              secure, so please do not send us sensitive information, such as
              government ID numbers or passwords, through the form.
            </p>
          </Section>

          <Section title="Your rights">
            <p>Under the Data Privacy Act of 2012 you have the right to:</p>
            <ul className="list-disc space-y-2 pl-5">
              {rights.map((right) => (
                <li key={right}>{right}</li>
              ))}
            </ul>
            <p>
              To use any of these, email{" "}
              <a
                href="mailto:contact@cafton.com"
                className="font-medium text-foreground underline underline-offset-4"
              >
                contact@cafton.com
              </a>
              . If you believe your data has been mishandled you may also
              complain to the{" "}
              <a
                href="https://privacy.gov.ph"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                National Privacy Commission
              </a>
              .
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              If we change how we handle your information or which cookies we
              use, we will update this page and its date, and ask for your
              choice again if the cookies change. Questions about this policy
              can go to the address above, or you can{" "}
              <Link
                href="/contact"
                className="font-medium text-foreground underline underline-offset-4"
              >
                contact us
              </Link>
              .
            </p>
          </Section>
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
