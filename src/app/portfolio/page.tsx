import type { Metadata } from "next";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { ProjectCard } from "@/components/portfolio/project-card";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { projects } from "@/lib/projects";
import { cardGridClass } from "@/lib/card-grid";

export const metadata: Metadata = {
  title: "Portfolio - CAFTON",
  description:
    "Case studies of technology CAFTON has built around real problems: disaster response, restaurant and retail operations, and more.",
};

export default function WorkPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Technology we&apos;ve built around real problems.
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                We engineer custom software, web and mobile applications, and SaaS
                products around the way organizations actually work.
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell>
          <RevealGroup
            className={`grid gap-6 ${cardGridClass(projects.length)}`}
          >
            {projects.map((project) => (
              <RevealItem key={project.slug}>
                <ProjectCard project={project} />
              </RevealItem>
            ))}
          </RevealGroup>
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
