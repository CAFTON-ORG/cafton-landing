"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { DotPattern } from "@/components/shared/dot-pattern";
import {
  GrowthIllustration,
  IndustryPlatformsIllustration,
  OperationsIllustration,
  ProductBuildsIllustration,
} from "@/components/services/pillar-illustrations";
import { servicePillars } from "@/lib/services";
import { cn } from "@/lib/utils";

/** Visual order -- distinct from `servicePillars`' own order, which matches the contact form's Goals step. */
const ORDER = ["operations", "growth", "industry-platforms", "product-builds"];

const ILLUSTRATIONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  operations: OperationsIllustration,
  growth: GrowthIllustration,
  "industry-platforms": IndustryPlatformsIllustration,
  "product-builds": ProductBuildsIllustration,
};

const pillars = ORDER.map((slug) =>
  servicePillars.find((pillar) => pillar.slug === slug),
).filter((pillar): pillar is NonNullable<typeof pillar> => Boolean(pillar));

interface ServiceIndexProps {
  /** Homepage teaser: tighter rows, no list of the systems inside. */
  compact?: boolean;
}

/**
 * The four service areas as a numbered index beside one preview frame. The
 * frame shows the illustration of whichever row is hovered or focused, and
 * only that one is ever in the DOM, so there is no stack of layered, masked
 * tiles for the browser to paint and composite while scrolling (the old
 * bento grid's cost). On small screens the frame is hidden and the rows stand
 * alone.
 */
export function ServiceIndex({ compact = false }: ServiceIndexProps) {
  const [active, setActive] = useState(0);
  const current = pillars[active];
  const Illustration = ILLUSTRATIONS[current.slug];

  return (
    <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
      <RevealGroup className="border-t">
        {pillars.map((pillar, index) => {
          const isActive = index === active;
          const shown = pillar.systems.slice(0, 3);
          const rest = pillar.systems.length - shown.length;

          return (
            <RevealItem key={pillar.slug}>
              <Link
                href={`/services/${pillar.slug}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                className={cn(
                  "group grid grid-cols-[2.5rem_1fr_auto] items-start gap-x-4 border-b outline-none focus-visible:bg-muted/40 sm:grid-cols-[3.5rem_1fr_auto]",
                  compact ? "py-6 sm:py-7" : "py-8 sm:py-10",
                )}
              >
                <span
                  className={cn(
                    "pt-2 text-xs font-semibold tabular-nums tracking-[0.2em] transition-colors duration-300",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <h3
                    className={cn(
                      "text-balance font-bold leading-tight tracking-tight transition-colors duration-300",
                      compact ? "text-2xl sm:text-3xl" : "text-2xl sm:text-4xl",
                      isActive ? "text-foreground" : "text-foreground lg:text-foreground/50",
                    )}
                  >
                    {pillar.title}
                  </h3>
                  <p className="mt-2 max-w-md text-muted-foreground">{pillar.tagline}</p>
                  {!compact && (
                    <p className="mt-4 text-xs leading-5 text-muted-foreground">
                      {shown.map((system) => system.title).join("  /  ")}
                      {rest > 0 && `  /  +${rest} more`}
                    </p>
                  )}
                </div>

                <ArrowUpRight
                  aria-hidden="true"
                  className={cn(
                    "mt-1 size-6 shrink-0 transition-all duration-300",
                    isActive
                      ? "translate-y-0 text-foreground"
                      : "translate-y-1 text-muted-foreground opacity-60",
                  )}
                />
              </Link>
            </RevealItem>
          );
        })}
      </RevealGroup>

      <div className="relative hidden lg:block">
        <div className="sticky top-28">
          <div className="relative aspect-4/3 overflow-hidden rounded-xl border bg-muted/30">
            <DotPattern size="sm" opacity="low" fadeStyle="none" />
            <div
              key={current.slug}
              className="absolute inset-0 animate-in fade-in duration-500 motion-reduce:animate-none"
            >
              <Illustration className="size-full" />
            </div>
            <span aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-3 border-l border-t border-foreground/60" />
            <span aria-hidden="true" className="pointer-events-none absolute right-3 top-3 size-3 border-r border-t border-foreground/60" />
            <span aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 size-3 border-b border-l border-foreground/60" />
            <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 size-3 border-b border-r border-foreground/60" />
          </div>
          <p className="mt-4 flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span>{current.title}</span>
            <span className="tabular-nums">
              {String(active + 1).padStart(2, "0")} / {String(pillars.length).padStart(2, "0")}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
