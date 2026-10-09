import type { Project } from "@/types/content";
import { CoverArt } from "@/components/shared/cover-art";
import { ThemedImage } from "@/components/shared/themed-image";

export function ProjectHeroImage({ project }: { project: Project }) {
  return (
    <div className="relative aspect-video bg-muted/40">
      {project.imageLight && project.imageDark ? (
        <ThemedImage
          light={project.imageLight}
          dark={project.imageDark}
          alt={project.imageAlt ?? ""}
          fill
          sizes="100vw"
          priority
          className={
            project.imageFit === "contain" ? "object-contain p-12" : "object-cover object-top"
          }
        />
      ) : (
        <CoverArt />
      )}
    </div>
  );
}
