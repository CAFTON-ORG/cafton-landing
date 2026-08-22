import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ContactForm } from "@/components/shared/contact-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock3, Mail } from "lucide-react";

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
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[2fr_3fr] lg:items-start ">
            <div className="flex flex-col gap-6">
              <Card className="border-primary/15 bg-primary/5 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Email us directly
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Send us the problem you&apos;re solving, your timeline, and
                    anything useful for us to know.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button className="cursor-pointer" asChild>
                      <a href={`mailto:contact@cafton.net`}>Contact Email</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock3 className="h-5 w-5 text-primary" />
                    What to expect
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">
                    We usually reply within 1 business day.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Please include a short description of your request so we can
                    route it properly.
                  </p>
                </CardContent>
              </Card>
            </div>
            <ContactForm leadSource="Contact Us Page" pageName="Contact Us" />
          </div>
        </PageShell>
      </PageSection>
    </>
  );
}
