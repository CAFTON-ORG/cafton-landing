import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ProjectCard } from "@/components/portfolio/project-card";
import type { Project } from "@/types/content";

interface RelatedProjectsProps {
  projects: Project[];
  heading: string;
}

export function RelatedProjects({ projects, heading }: RelatedProjectsProps) {
  if (projects.length === 0) return null;

  return (
    <PageSection className="border-t">
      <PageShell>
        <Reveal className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h2>
        </Reveal>
        <RevealGroup className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <RevealItem key={project.slug}>
              <ProjectCard project={project} />
            </RevealItem>
          ))}
        </RevealGroup>
      </PageShell>
    </PageSection>
  );
}
