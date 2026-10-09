import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { servicePillars } from "@/lib/services";

export function WhereWeCanHelp() {
  return (
    <>
    <section id="services" className="border-t py-14 sm:py-16 lg:py-20">
      <PageShell>
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              Where we can help.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Four areas we build in, from the back office to a product that
              doesn&apos;t exist yet.
            </p>
          </div>
          <Link
            href="/services"
            className="group inline-flex items-center text-sm font-medium text-foreground"
          >
            View all services
            <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>
        <RevealGroup className="grid sm:grid-cols-2 sm:gap-x-12">
          {servicePillars.map(({ icon: Icon, title, tagline, slug }, index) => (
            <RevealItem key={slug} className="border-t">
              <Link
                href={`/services/${slug}`}
                className="group relative block overflow-hidden py-9 pr-20 outline-none focus-visible:bg-muted/40"
              >
                <Icon
                  strokeWidth={1}
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-3 -right-3 size-36 text-foreground/[0.07] transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-110"
                />
                <span className="text-xs font-semibold tabular-nums tracking-[0.2em] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-2xl font-bold tracking-tight transition-transform duration-300 group-hover:translate-x-2">
                  {title}
                </h3>
                <p className="mt-2 max-w-sm text-muted-foreground">{tagline}</p>
                <ArrowUpRight
                  aria-hidden="true"
                  className="absolute right-0 top-9 size-6 text-muted-foreground transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-foreground"
                />
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </PageShell>
    </section>
    </>
  );
}
