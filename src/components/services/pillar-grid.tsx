import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RevealItem } from "@/components/motion/reveal";
import { CornerBrackets } from "@/components/shared/corner-brackets";
import { DotPattern } from "@/components/shared/dot-pattern";
import { servicePillars } from "@/lib/services";
import { cn } from "@/lib/utils";

/**
 * Visual (hero/square/square/hero) order for the bento grid -- distinct from
 * `servicePillars`' own array order, which stays logical (matches how the
 * contact form's Goals step groups its checkboxes).
 */
const GRID_ORDER = ["industry-platforms", "operations", "growth", "product-builds"];

const orderedPillars = GRID_ORDER.map((slug) =>
  servicePillars.find((pillar) => pillar.slug === slug),
).filter((pillar): pillar is NonNullable<typeof pillar> => Boolean(pillar));

interface PillarGridProps {
  /** Homepage teaser: shorter tiles, title only. Defaults to the full detail treatment. */
  compact?: boolean;
}

/**
 * Bento layout modeled on an owner-supplied reference screenshot: full-bleed
 * tile imagery (here, an honest dot-pattern placeholder -- no real
 * photography exists yet for these four systems) with the pillar's identity
 * overlaid directly on it via a bottom scrim, one wide "hero" tile and two
 * taller ones per row rather than every tile sharing one fixed shape. The
 * reference's own wording/screenshots aren't reused, only its size/overlay
 * language -- each tile still has to identify its own pillar and link to
 * its own `/services/[slug]` page, unlike the reference's apparent
 * one-CTA-plus-decorative-imagery board.
 */
export function PillarGrid({ compact = false }: PillarGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {orderedPillars.map((pillar, index) => {
        const isWide = index === 0 || index === 3;

        return (
          <RevealItem
            key={pillar.slug}
            className={cn(isWide && "sm:col-span-2")}
          >
            <Link
              href={`/services/${pillar.slug}`}
              className={cn(
                "group relative flex w-full flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                compact
                  ? isWide
                    ? "min-h-50 sm:min-h-55"
                    : "min-h-60 sm:min-h-70"
                  : isWide
                    ? "min-h-65 sm:min-h-75"
                    : "min-h-80 sm:min-h-110",
              )}
            >
              <CornerBrackets />

              {/*
                No real photography exists yet for these four systems --
                this is an honest placeholder in the site's own established
                dot-pattern/glow language (see `ImagePlaceholder`), not a
                stand-in claiming to be a real photo. Swap for real imagery
                per pillar whenever it exists; the scrim + overlay content
                below is built to sit over a real photo unchanged.
              */}
              <div className="absolute inset-0 bg-muted/30" aria-hidden="true">
                <DotPattern size="sm" opacity="low" fadeStyle="ellipse" />
                <div
                  className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_40%,color-mix(in_oklch,var(--foreground)_10%,transparent)_0%,transparent_65%)]"
                />
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(circle_at_50%_40%,color-mix(in_oklch,var(--foreground)_18%,transparent)_0%,transparent_65%)]"
                />
                <pillar.icon
                  className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/30 transition-transform duration-500 ease-out group-hover:scale-110 sm:size-24"
                  aria-hidden="true"
                />
              </div>
              <span className="sr-only">{pillar.title} illustration placeholder</span>

              {/* Scrim: keeps the overlaid text legible over the tile image regardless of what's behind it. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-linear-to-t from-background via-background/55 to-transparent"
              />

              <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8">
                <div className="flex flex-col">
                  <span className="inline-flex size-10 w-fit items-center justify-center rounded-full border bg-background/80 backdrop-blur-sm">
                    <pillar.icon className="size-5 text-foreground" aria-hidden="true" />
                  </span>
                  <h3
                    className={cn(
                      "mt-4 font-bold tracking-tight",
                      isWide ? "text-xl sm:text-2xl" : "text-lg sm:text-xl",
                    )}
                  >
                    {pillar.title}
                  </h3>
                  {!compact && (
                    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
                      {pillar.tagline}
                    </p>
                  )}
                </div>

                <span className="mt-6 inline-flex w-fit items-center gap-3 text-sm font-medium text-foreground">
                  Explore Service
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:translate-x-1">
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </span>
              </div>
            </Link>
          </RevealItem>
        );
      })}
    </div>
  );
}
