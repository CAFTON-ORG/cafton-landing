"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ThemedImage } from "@/components/shared/themed-image";
import { CoverArt } from "@/components/shared/cover-art";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import type { Project } from "@/lib/projects";
import { cn } from "@/lib/utils";

function fitClass(project: Project) {
  return project.imageFit === "contain"
    ? "object-contain p-10"
    : "object-cover object-top";
}

/**
 * Index-and-preview showcase: a numbered list of projects beside one sticky
 * frame that cross-fades to whichever row is hovered or focused. Only opacity
 * animates, so there is no per-frame layout or filter work.
 */
export function WorkShowcase({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState(0);
  const current = projects[active];

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <RevealGroup className="border-t">
        {projects.map((project, index) => {
          const isActive = index === active;
          return (
            <RevealItem key={project.slug}>
              <Link
                href={`/portfolio/${project.slug}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                className="group block border-b py-7 outline-none focus-visible:bg-muted/40 sm:py-9"
              >
                <div className="flex items-start gap-5 sm:gap-8">
                  <span
                    className={cn(
                      "pt-2 text-xs font-semibold tabular-nums tracking-[0.2em] transition-colors duration-300",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {project.client} &middot; {project.category}
                    </p>
                    <h3
                      className={cn(
                        "mt-3 text-balance text-2xl font-bold leading-tight tracking-tight transition-colors duration-300 sm:text-3xl",
                        isActive ? "text-foreground" : "text-foreground/45",
                      )}
                    >
                      {project.title}
                    </h3>
                    <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-6 text-muted-foreground">
                      {project.summary}
                    </p>

                    <div className="relative mt-5 aspect-video overflow-hidden rounded-lg border bg-muted/40 lg:hidden">
                      {project.imageLight && project.imageDark ? (
                        <ThemedImage
                          light={project.imageLight}
                          dark={project.imageDark}
                          alt={project.imageAlt ?? ""}
                          fill
                          sizes="100vw"
                          className={fitClass(project)}
                        />
                      ) : (
                        <CoverArt />
                      )}
                    </div>
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
                </div>
              </Link>
            </RevealItem>
          );
        })}
      </RevealGroup>

      <div className="relative hidden lg:block">
        <div className="sticky top-28">
          <div className="relative aspect-4/3 overflow-hidden rounded-xl border bg-muted/40">
            {projects.map((project, index) => (
              <div
                key={project.slug}
                aria-hidden={index !== active}
                className={cn(
                  "absolute inset-0 transition-opacity duration-500",
                  index === active ? "opacity-100" : "opacity-0",
                )}
              >
                {project.imageLight && project.imageDark ? (
                  <ThemedImage
                    light={project.imageLight}
                    dark={project.imageDark}
                    alt={project.imageAlt ?? ""}
                    fill
                    sizes="45vw"
                    className={fitClass(project)}
                  />
                ) : (
                  <CoverArt />
                )}
              </div>
            ))}
            <span className="pointer-events-none absolute left-3 top-3 size-3 border-l border-t border-foreground/60" />
            <span className="pointer-events-none absolute right-3 top-3 size-3 border-r border-t border-foreground/60" />
            <span className="pointer-events-none absolute bottom-3 left-3 size-3 border-b border-l border-foreground/60" />
            <span className="pointer-events-none absolute bottom-3 right-3 size-3 border-b border-r border-foreground/60" />
          </div>
          <p className="mt-4 flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span>{current.client}</span>
            <span className="tabular-nums">
              {String(active + 1).padStart(2, "0")} /{" "}
              {String(projects.length).padStart(2, "0")}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
