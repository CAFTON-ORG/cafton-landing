import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  /** Homepage teaser: no system chips, tighter copy. Defaults to the full detail treatment. */
  compact?: boolean;
}

export function PillarGrid({ compact = false }: PillarGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {orderedPillars.map((pillar, index) => {
        const isWide = index === 0 || index === 3;
        const visibleSystems = compact
          ? pillar.systems.slice(0, 3)
          : pillar.systems;
        const hiddenCount = pillar.systems.length - visibleSystems.length;

        return (
          <RevealItem
            key={pillar.slug}
            className={cn(isWide && "sm:col-span-2")}
          >
            <Link
              href={`/services/${pillar.slug}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CornerBrackets />

              {/*
                No real photography exists yet for these four systems --
                this is an honest placeholder in the site's own established
                dot-pattern/glow language (see `ImagePlaceholder`), not a
                stand-in claiming to be a real photo. Swap for real imagery
                per pillar whenever it exists.
              */}
              <div className="relative aspect-video w-full shrink-0 overflow-hidden border-b bg-muted/30">
                <DotPattern size="sm" opacity="low" fadeStyle="ellipse" />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_45%,color-mix(in_oklch,var(--foreground)_10%,transparent)_0%,transparent_65%)]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(circle_at_50%_45%,color-mix(in_oklch,var(--foreground)_18%,transparent)_0%,transparent_65%)]"
                />
                <pillar.icon
                  className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/40 transition-transform duration-500 ease-out group-hover:scale-110 sm:size-20"
                  aria-hidden="true"
                />
                <span className="sr-only">{pillar.title} illustration placeholder</span>
              </div>

              <div
                className={cn(
                  "flex flex-1 flex-col p-6 sm:p-8",
                  isWide && "sm:flex-row sm:items-start sm:justify-between sm:gap-8",
                )}
              >
                <div className="flex flex-col">
                  <h3
                    className={cn(
                      "font-bold tracking-tight",
                      isWide ? "text-xl sm:text-2xl" : "text-lg sm:text-xl",
                    )}
                  >
                    {pillar.title}
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
                    {pillar.tagline}
                  </p>

                  {!compact && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {visibleSystems.map((system) => (
                        <Badge key={system.title} variant="secondary" className="font-normal">
                          {system.title}
                        </Badge>
                      ))}
                      {hiddenCount > 0 && (
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                          +{hiddenCount} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <span className="mt-6 inline-flex items-center text-sm font-medium text-foreground sm:mt-0 sm:self-end">
                  Explore
                  <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </RevealItem>
        );
      })}
    </div>
  );
}
