import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/lib/projects";
import { ThemedImage } from "@/components/shared/themed-image";
import { CoverArt } from "@/components/shared/cover-art";
import { CornerBrackets } from "@/components/shared/corner-brackets";
import { cn } from "@/lib/utils";

interface ProjectRowProps {
  project: Project;
  /** Zero-based position in the list; drives the case-file number and the left/right alternation. */
  index: number;
}

/**
 * Case-file row: a large framed screenshot beside the write-up, flipping sides
 * on every other row. A single link wraps the whole row, and only the image
 * transforms on hover.
 */
export function ProjectRow({ project, index }: ProjectRowProps) {
  const flip = index % 2 === 1;

  return (
    <Link
      href={`/portfolio/${project.slug}`}
      className="group grid items-center gap-6 border-b py-10 outline-none first:border-t focus-visible:bg-muted/30 lg:grid-cols-2 lg:gap-14 lg:py-14"
    >
      <div
        className={cn(
          "relative aspect-16/10 overflow-hidden rounded-xl border bg-muted/40",
          flip && "lg:order-2",
        )}
      >
        {project.imageLight && project.imageDark ? (
          <ThemedImage
            light={project.imageLight}
            dark={project.imageDark}
            alt={project.imageAlt ?? ""}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className={cn(
              "transition-transform duration-700 ease-out group-hover:scale-105",
              project.imageFit === "contain"
                ? "object-contain p-10"
                : "object-cover object-top",
            )}
          />
        ) : (
          <CoverArt />
        )}
        <CornerBrackets />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <span className="tabular-nums text-foreground">
            Case {String(index + 1).padStart(2, "0")}
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
          <span>{project.category}</span>
        </div>

        <p className="mt-6 text-sm font-medium text-muted-foreground">
          {project.client}
        </p>
        <h2 className="mt-2 text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {project.title}
        </h2>
        <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          {project.summary}
        </p>

        <span className="mt-8 inline-flex w-fit items-center gap-3 text-sm font-medium">
          View case study
          <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:translate-x-1">
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </span>
      </div>
    </Link>
  );
}
