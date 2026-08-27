import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Project } from "@/lib/projects";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/portfolio/${project.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/20"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={project.imageLight}
          alt={project.imageAlt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover object-top transition-transform duration-500 group-hover:scale-105 dark:hidden"
        />
        <Image
          src={project.imageDark}
          alt={project.imageAlt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="hidden object-cover object-top transition-transform duration-500 group-hover:scale-105 dark:block"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <p className="text-sm font-medium text-muted-foreground">
          {project.client}
        </p>
        <h3 className="text-lg font-semibold leading-snug">{project.title}</h3>
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {project.summary}
        </p>
        <span className="mt-auto inline-flex items-center pt-2 text-sm font-medium text-foreground">
          View case study
          <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
