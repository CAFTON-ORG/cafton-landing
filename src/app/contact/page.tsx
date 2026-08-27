import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ContactForm } from "@/components/shared/contact-form";
import { Button } from "@/components/ui/button";
import { Clock3, Mail } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

export default function ContactPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Contact
              </p>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Have a problem worth solving?
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                Tell us what you&apos;re building, what isn&apos;t working, or what
                you&apos;d like to improve.
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell className="max-w-3xl">
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[2fr_3fr] lg:items-start ">
            <Reveal className="flex flex-col gap-8">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Mail className="h-5 w-5 text-foreground" />
                  Email us directly
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Send us the problem you&apos;re solving, your timeline, and
                  anything useful for us to know.
                </p>
                <Button className="mt-4 cursor-pointer" asChild>
                  <a href={`mailto:contact@cafton.net`}>Contact Email</a>
                </Button>
              </div>

              <div className="border-t border-border pt-8">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Clock3 className="h-5 w-5 text-foreground" />
                  What to expect
                </h2>
                <p className="mt-3 text-muted-foreground">
                  We usually reply within 1 business day.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please include a short description of your request so we can
                  route it properly.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <ContactForm leadSource="Contact Us Page" pageName="Contact Us" />
            </Reveal>
          </div>
        </PageShell>
      </PageSection>
    </>
  );
}
