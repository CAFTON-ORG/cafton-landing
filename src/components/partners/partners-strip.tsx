import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/motion/reveal";
import { LogoPlate } from "@/components/partners/logo-plate";
import { DotPattern } from "@/components/shared/dot-pattern";
import { Logo } from "@/components/shared/logo";
import { listPartners } from "@/lib/repositories/partners";

/** The homepage band shows at most this many plates; the rest collapse into a "+N more" plate that links on. */
const STRIP_MAX = 4;

/**
 * Homepage band, placed right after Featured work: the work shows what we
 * build, this shows who we build it with. Cafton's mark on the left, joined by
 * a dashed line to each partner's plate -- the relationship drawn as a
 * connection instead of a bare logo wall -- on a tinted band that sets it
 * apart from the sections around it. Static markup: a handful of marks
 * doesn't need a scrolling carousel, and when there are more than the band
 * can hold it shows the featured ones and a "+N more" plate that links to the
 * full section. `--plate` sizes every plate and aligns the connector to their
 * centres.
 */
export async function PartnersStrip() {
  const partners = await listPartners();
  const ordered = [...partners].sort(
    (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
  );
  const overflow = ordered.length > STRIP_MAX;
  const visible = overflow ? ordered.slice(0, STRIP_MAX - 1) : ordered;
  const hidden = ordered.length - visible.length;

  return (
    <section className="relative overflow-hidden border-y bg-muted/30 py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0">
        <DotPattern size="md" fadeStyle="ellipse" opacity="low" />
      </div>
      <PageShell className="relative grid items-center gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Partners and sponsorships
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            In good company, and giving back.
          </h2>
          <p className="mt-4 max-w-sm text-muted-foreground">
            The organizations we build with and stand behind.
          </p>
          <Link
            href="/about#partners"
            className="group mt-6 inline-flex items-center text-sm font-medium"
          >
            Meet our partners
            <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <Reveal>
          <ul className="flex items-start [--plate:4.5rem] sm:[--plate:7rem] lg:[--plate:7.5rem]">
            <li
              aria-hidden="true"
              className="flex shrink-0 items-center justify-center rounded-full bg-foreground text-background"
              style={{
                width: "2.75rem",
                height: "2.75rem",
                marginTop: "calc(var(--plate) / 2 - 1.375rem)",
              }}
            >
              <Logo size={18} />
            </li>
            {visible.map((partner) => (
              <li key={partner.name} className="contents">
                <span
                  aria-hidden="true"
                  className="mx-1.5 min-w-3 flex-1 border-t-2 border-dashed border-foreground/25 sm:mx-3"
                  style={{ marginTop: "calc(var(--plate) / 2)" }}
                />
                <div className="shrink-0 text-center" style={{ width: "var(--plate)" }}>
                  <LogoPlate partner={partner} sizes="(min-width: 640px) 7.5rem, 4.5rem" />
                  <p className="mt-3 text-sm font-semibold leading-tight">{partner.shortName}</p>
                  {partner.roles && (
                    <p className="mt-0.5 text-[0.7rem] leading-tight text-muted-foreground">
                      {partner.roles[0]}
                    </p>
                  )}
                </div>
              </li>
            ))}
            {overflow && (
              <li className="contents">
                <span
                  aria-hidden="true"
                  className="mx-1.5 min-w-3 flex-1 border-t-2 border-dashed border-foreground/25 sm:mx-3"
                  style={{ marginTop: "calc(var(--plate) / 2)" }}
                />
                <Link
                  href="/about#partners"
                  className="group shrink-0 text-center outline-none"
                  style={{ width: "var(--plate)" }}
                >
                  <span className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed text-xl font-bold transition-colors group-hover:bg-foreground group-hover:text-background group-focus-visible:ring-[3px] group-focus-visible:ring-ring sm:text-2xl">
                    +{hidden}
                  </span>
                  <span className="mt-3 block text-sm font-semibold leading-tight">More</span>
                  <span className="mt-0.5 block text-[0.7rem] leading-tight text-muted-foreground">
                    All partners
                  </span>
                </Link>
              </li>
            )}
          </ul>
        </Reveal>
      </PageShell>
    </section>
  );
}
