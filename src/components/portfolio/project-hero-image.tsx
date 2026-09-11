"use client";

import { useState } from "react";
import Image from "next/image";
import type { Project } from "@/lib/projects";
import { ImageSkeleton } from "@/components/shared/image-skeleton";

export function ProjectHeroImage({ project }: { project: Project }) {
  const [loaded, setLoaded] = useState(false);
  const fitClass =
    project.imageFit === "contain" ? "object-contain p-12" : "object-cover object-top";

  return (
    <div className="relative aspect-video">
      {!loaded && <ImageSkeleton />}
      <Image
        src={project.imageLight}
        alt={project.imageAlt}
        fill
        sizes="100vw"
        priority
        onLoad={() => setLoaded(true)}
        className={`${fitClass} transition-opacity duration-500 dark:hidden ${loaded ? "opacity-100" : "opacity-0"}`}
      />
      <Image
        src={project.imageDark}
        alt={project.imageAlt}
        fill
        sizes="100vw"
        priority
        onLoad={() => setLoaded(true)}
        className={`hidden ${fitClass} transition-opacity duration-500 dark:block ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
