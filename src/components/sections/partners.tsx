import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { DotPattern } from "@/components/shared/dot-pattern";
import { Logo } from "@/components/shared/logo";
import { partners, type Partner } from "@/lib/partners";
import { cn } from "@/lib/utils";

/**
 * Up to this many partners, every partner gets a full entry (plate, roles,
 * story, links) in one even row. Past it the section switches layout rather
 * than growing a very long list: partners marked `featured` keep their full
 * entry, and everyone else moves into a dense wall of smaller plates.
 */
const SHOWCASE_MAX = 6;

/** The homepage band shows at most this many plates; the rest collapse into a "+N more" plate that links on. */
const STRIP_MAX = 4;

/**
 * A partner's mark on a square plate. Every plate is the same size and radius
 * so very different logos (a white-on-black monogram, a white-on-green
 * wordmark, a transparent blue crest) read as one set; "cover" logos supply
 * their own square artwork, "contain" logos sit on a plate colour.
 */
function LogoPlate({ partner, sizes }: { partner: Partner; sizes: string }) {
  const { logo } = partner;

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-2xl border",
        logo.fit === "contain" && (logo.plate ?? "bg-muted"),
      )}
    >
      <Image
        src={logo.src}
        alt={`${partner.name} logo`}
        fill
        sizes={sizes}
        className={logo.fit === "cover" ? "object-cover" : "object-contain p-[12%]"}
      />
    </div>
  );
}

function RoleTags({ roles }: { roles: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {roles.map((role) => (
        <li
          key={role}
          className="rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          {role}
        </li>
      ))}
    </ul>
  );
}

function PartnerEntry({ partner }: { partner: Partner }) {
  return (
    <>
      <div className="mx-auto w-full max-w-60 transition-transform duration-300 ease-out group-hover:-translate-y-1 sm:max-w-none">
        <LogoPlate partner={partner} sizes="(min-width: 640px) 30vw, 240px" />
      </div>

      <div className="mx-auto mt-5 max-w-60 sm:max-w-none">
        {partner.roles && <RoleTags roles={partner.roles} />}
        <h3 className="mt-3 text-balance text-xl font-bold leading-tight tracking-tight">
          {partner.name}
        </h3>
        {partner.description && (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {partner.description}
          </p>
        )}
        {partner.links && (
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {partner.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group/link inline-flex items-center text-sm font-medium"
                >
                  {link.label}
                  <ArrowUpRight className="ms-1 size-4 transition-transform duration-300 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function PartnerWall({ items }: { items: Partner[] }) {
  return (
    <RevealGroup className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((partner) => (
        <RevealItem key={partner.name} className="group">
          <div className="transition-transform duration-300 ease-out group-hover:-translate-y-1">
            <LogoPlate partner={partner} sizes="(min-width: 1024px) 14vw, (min-width: 640px) 28vw, 44vw" />
          </div>
          <p className="mt-3 text-sm font-semibold leading-tight">{partner.shortName}</p>
          {partner.roles && (
            <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
              {partner.roles[0]}
            </p>
          )}
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

/**
 * Full section for the About page. It scales with the number of partners:
 * a handful are shown as an even row of full entries; many become a featured
 * group (the partners that have a story to tell) above a wall of smaller
 * plates for everyone else. A short description and links appear only for
 * partners that have them, so a partner with less to say is never padded
 * with filler.
 */
export function PartnersSection() {
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
export function PartnersStrip() {
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
