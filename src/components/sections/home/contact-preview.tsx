import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Clock3, ArrowUpRight } from "lucide-react";
import { ContactForm } from "@/components/shared/contact-form";

const contactEmail = "contact@cafton.net";

export function ContactPreview() {
  const mailtoHref = `mailto:${contactEmail}`;

  return (
    <section id="contact" className="py-14 sm:py-16 lg:py-20">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Get In Touch
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Start a conversation
          </h2>
          <p className="text-lg text-muted-foreground">
            Tell us what you&apos;re trying to accomplish. We&apos;ll help you
            figure out what technology can do about it.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
          <ContactForm leadSource="Homepage" pageName="Home" />

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
                    <a href={mailtoHref}>
                      {contactEmail}
                      <ArrowUpRight className="ms-2 h-4 w-4" />
                    </a>
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
        </div>
      </div>
    </section>
  );
}
