import { ArrowRight, CalendarDays, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/marketing/decor/dot-pattern";
import { MarkWatermark } from "@/components/marketing/decor/mark-watermark";
import { PageSection, PageShell } from "@/components/marketing/layout/page-shell";
import { Reveal } from "@/components/marketing/motion/reveal";
import { getSiteSettings } from "@/features/cms/repository/site";

/** Closing call to action shared by the home, portfolio, blog, and service pages. */
export async function ProjectCta() {
  const { facts, email, bookingUrl } = await getSiteSettings();
  return (
    <PageSection>
      <PageShell>
        <Reveal>
          <div className="relative w-full overflow-hidden rounded-2xl border bg-linear-to-br from-card via-card to-muted/60">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <DotPattern size="md" fadeStyle="ellipse" opacity="low" />
              <div className="absolute inset-0 [background:radial-gradient(circle_at_85%_50%,color-mix(in_oklch,var(--foreground)_14%,transparent)_0%,transparent_60%)]" />
              <MarkWatermark className="-right-12 top-1/2 h-[28rem] w-auto -translate-y-1/2 opacity-[0.22] lg:right-8 lg:h-[26rem]" />
              {/* Viewfinder corners, the same motif as the home hero and loader. */}
              <span className="absolute left-4 top-4 size-5 border-l-2 border-t-2 border-foreground/30" />
              <span className="absolute right-4 top-4 size-5 border-r-2 border-t-2 border-foreground/30" />
              <span className="absolute bottom-4 left-4 size-5 border-b-2 border-l-2 border-foreground/30" />
              <span className="absolute bottom-4 right-4 size-5 border-b-2 border-r-2 border-foreground/30" />
            </div>

            <div className="relative grid gap-10 px-8 py-16 sm:px-14 sm:py-20 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-16 lg:px-20">
              <div>
                <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  <span aria-hidden="true" className="h-px w-8 bg-foreground/40" />
                  Let&apos;s talk
                </p>
                <h2 className="mt-5 max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                  Have a problem worth solving?
                </h2>
                <p className="mt-5 max-w-xl text-balance text-muted-foreground sm:text-lg">
                  Tell us what you&apos;re trying to accomplish. We&apos;ll help
                  you figure out what technology can do about it.
                </p>
                <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                  {facts.map((fact) => (
                    <li key={fact} className="whitespace-nowrap">
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-col lg:items-start">
                <Button size="lg" className="group h-12 cursor-pointer rounded-full px-7" asChild>
                  <Link href="/contact">
                    Contact Us
                    <ArrowRight
                      className="ms-2 size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                </Button>
                {bookingUrl && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 cursor-pointer rounded-full px-7"
                    asChild
                  >
                    <Link
                      href={bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CalendarDays className="size-4" aria-hidden="true" />
                    Book a call
                  </Link>
                  </Button>
                )}
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-2 rounded-full py-2 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring sm:ps-1"
                >
                  <Mail className="size-4" aria-hidden="true" />
                  {email}
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </PageShell>
    </PageSection>
  );
}
