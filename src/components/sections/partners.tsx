import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { PartnerEntry, PartnerWall } from "@/components/partners/partner-entry";
import { listPartners } from "@/lib/repositories/partners";
import { cn } from "@/lib/utils";

export { PartnersStrip } from "@/components/partners/partners-strip";

/**
 * Up to this many partners, every partner gets a full entry (plate, roles,
 * story, links) in one even row. Past it the section switches layout rather
 * than growing a very long list: partners marked `featured` keep their full
 * entry, and everyone else moves into a dense wall of smaller plates.
 */
const SHOWCASE_MAX = 6;

/**
 * Full section for the About page. It scales with the number of partners:
 * a handful are shown as an even row of full entries; many become a featured
 * group (the partners that have a story to tell) above a wall of smaller
 * plates for everyone else. A short description and links appear only for
 * partners that have them, so a partner with less to say is never padded
 * with filler.
 */
export async function PartnersSection() {
  const partners = await listPartners();
  const showcase = partners.length <= SHOWCASE_MAX;
  const featured = partners.filter((partner) => partner.featured);
  const rest = partners.filter((partner) => !partner.featured);

  return (
    <PageSection className="border-t">
      <PageShell id="partners" className="scroll-mt-24">
        <Reveal className="grid gap-6 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Partners and sponsorships
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              Backing the communities we build for.
            </h2>
          </div>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground lg:pt-9">
            Beyond client work, we show up as a sponsor and a technology
            partner for the organizations around us.
          </p>
        </Reveal>

        {showcase ? (
          <RevealGroup
            className={cn(
              "mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2",
              partners.length <= 3 ? "sm:grid-cols-3" : "lg:grid-cols-3",
            )}
          >
            {partners.map((partner) => (
              <RevealItem key={partner.name} className="group">
                <PartnerEntry partner={partner} />
              </RevealItem>
            ))}
          </RevealGroup>
        ) : (
          <div className="mt-14 space-y-16">
            {featured.length > 0 && (
              <RevealGroup className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((partner) => (
                  <RevealItem key={partner.name} className="group">
                    <PartnerEntry partner={partner} />
                  </RevealItem>
                ))}
              </RevealGroup>
            )}
            {rest.length > 0 && (
              <div>
                <p className="mb-6 border-b pb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  All partners
                </p>
                <PartnerWall items={rest} />
              </div>
            )}
          </div>
        )}

        <Reveal className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t pt-8">
          <p className="max-w-md text-muted-foreground">
            Running an event, a school program, or a community project that
            could use a technology partner?
          </p>
          <Link
            href="/contact"
            className="group inline-flex items-center text-sm font-medium"
          >
            Partner with us
            <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </PageShell>
    </PageSection>
  );
}
