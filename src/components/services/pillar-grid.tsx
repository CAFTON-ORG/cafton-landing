import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RevealItem } from "@/components/motion/reveal";
import { CornerBrackets } from "@/components/shared/corner-brackets";
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
              className={cn(
                "group relative flex h-full flex-col overflow-hidden rounded-xl border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-8",
                isWide && "sm:flex-row sm:items-start sm:justify-between sm:gap-8",
              )}
            >
              <CornerBrackets />

              <div className="flex flex-col">
                <pillar.icon
                  className="size-7 shrink-0 text-foreground sm:size-8"
                  aria-hidden="true"
                />
                <h3
                  className={cn(
                    "mt-4 font-bold tracking-tight",
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
            </Link>
          </RevealItem>
        );
      })}
    </div>
  );
}
