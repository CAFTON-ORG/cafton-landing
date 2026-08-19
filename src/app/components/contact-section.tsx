import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Clock3, ArrowUpRight } from 'lucide-react'

const contactEmail = 'contact@cafton.net'

export function ContactSection() {
  const mailtoHref = `mailto:${contactEmail}`

  return (
    <section id="contact" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">Get In Touch</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Need help or have questions?
          </h2>
          <p className="text-lg text-muted-foreground">
            Our contact form is coming soon. For now, reach us directly by email and we&apos;ll get back
            to you as soon as we can.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          <Card className="border-primary/15 bg-primary/5 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email us directly
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Skip the form for now and send your message straight to our inbox.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" className="cursor-pointer" asChild>
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
                Please include a short description of your request so we can route it properly.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
