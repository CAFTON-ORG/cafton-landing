import { Button } from "@/components/ui/button";
import { Mail, Clock3, ArrowUpRight } from "lucide-react";
import { ContactForm } from "@/components/shared/contact-form";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

const contactEmail = "contact@cafton.net";

export function ContactPreview() {
  const mailtoHref = `mailto:${contactEmail}`;

  return (
    <section id="contact" className="py-14 sm:py-16 lg:py-20">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center mb-16">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Get In Touch
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Start a conversation
          </h2>
          <p className="text-lg text-muted-foreground">
            Tell us what you&apos;re trying to accomplish. We&apos;ll help you
            figure out what technology can do about it.
          </p>
        </Reveal>

        <RevealGroup className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
          <RevealItem>
            <ContactForm leadSource="Homepage" pageName="Home" />
          </RevealItem>

          <RevealItem className="flex flex-col gap-8">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Mail className="h-5 w-5 text-foreground" />
                Email us directly
              </h3>
              <p className="mt-3 text-muted-foreground">
                Send us the problem you&apos;re solving, your timeline, and
                anything useful for us to know.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button className="cursor-pointer" asChild>
                  <a href={mailtoHref}>
                    {contactEmail}
                    <ArrowUpRight className="ms-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-8">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Clock3 className="h-5 w-5 text-foreground" />
                What to expect
              </h3>
              <p className="mt-3 text-muted-foreground">
                We usually reply within 1 business day.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Please include a short description of your request so we can
                route it properly.
              </p>
            </div>
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  );
}
