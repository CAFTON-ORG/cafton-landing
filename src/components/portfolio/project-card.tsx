import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoverArt } from "@/components/shared/cover-art";
import { ThemedImage } from "@/components/shared/themed-image";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/content";

/** Compact project tile for "related work" strips on other pages. */
export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/portfolio/${project.slug}`} className="group block outline-none">
      <div className="relative aspect-16/10 overflow-hidden rounded-xl border bg-muted/40 transition-colors group-hover:border-foreground/30 group-focus-visible:ring-[3px] group-focus-visible:ring-ring">
        {project.imageLight && project.imageDark ? (
          <ThemedImage
            light={project.imageLight}
            dark={project.imageDark}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className={cn(
              "transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none",
              project.imageFit === "contain" ? "object-contain p-8" : "object-cover object-top",
            )}
          />
        ) : (
          <CoverArt />
        )}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {project.category}
      </p>
      <h3 className="mt-1 flex items-start justify-between gap-3 text-lg font-semibold tracking-tight">
        {project.client}: {project.title}
        <ArrowUpRight
          className="mt-1 size-4 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </h3>
    </Link>
  );
}
