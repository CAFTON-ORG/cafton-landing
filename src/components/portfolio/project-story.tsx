import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal, RevealItem } from "@/components/motion/reveal";
import { PhotoGallery } from "@/components/blog/photo-gallery";
import { ProjectFacts } from "@/components/portfolio/project-facts";
import type { Project } from "@/types/content";

/** The case study body: facts on the left, the problem, solution and recognition as numbered chapters on the right, then any extra screenshots. */
export function ProjectStory({ project }: { project: Project }) {
  const chapters = [
    project.problem && { label: "The problem", body: project.problem },
    project.solution && { label: "The solution", body: project.solution },
    project.recognition && { label: "Recognition", body: project.recognition },
  ].filter((chapter): chapter is { label: string; body: string } => Boolean(chapter));

  return (
    <PageSection>
      <PageShell>
        <div className="grid gap-12 lg:grid-cols-[1fr_2.2fr] lg:gap-20">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <ProjectFacts project={project} />
          </Reveal>

          <div>
            <Reveal>
              <p className="text-lg leading-8 text-foreground/90 sm:text-xl sm:leading-9">
                {project.description}
              </p>
            </Reveal>

            {chapters.length > 0 && (
              <ol className="mt-12 border-b">
                {chapters.map((chapter, index) => (
                  <RevealItem as="li" key={chapter.label} index={index} className="border-t">
                    <div className="flex gap-5 py-8 sm:gap-8">
                      <span className="pt-1 text-xs font-semibold tabular-nums tracking-[0.2em] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">{chapter.label}</h2>
                        <p className="mt-3 text-pretty leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                          {chapter.body}
                        </p>
                      </div>
                    </div>
                  </RevealItem>
                ))}
              </ol>
            )}
          </div>
        </div>

        {project.media && project.media.length > 0 && (
          <Reveal className="mt-16">
            <h2 className="mb-6 text-2xl font-bold tracking-tight">Screens</h2>
            <PhotoGallery images={project.media} />
          </Reveal>
        )}
      </PageShell>
    </PageSection>
  );
}
