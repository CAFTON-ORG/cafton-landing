import type { Metadata } from "next";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { ProjectCard } from "@/components/portfolio/project-card";
import { Pagination } from "@/components/shared/pagination";
import { CategoryFilter } from "@/components/shared/category-filter";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { projects } from "@/lib/projects";
import { cardGridClass } from "@/lib/card-grid";

export const metadata: Metadata = {
  title: "Portfolio - CAFTON",
  description:
    "Case studies of technology CAFTON has built around real problems: disaster response, restaurant and retail operations, and more.",
};

const PAGE_SIZE = 6;

interface WorkPageProps {
  searchParams: Promise<{ page?: string; category?: string }>;
}

export default async function WorkPage({ searchParams }: WorkPageProps) {
  const { page: pageParam, category: categoryParam } = await searchParams;

  const categories = Array.from(new Set(projects.map((project) => project.category)));
  const category = categoryParam && categories.includes(categoryParam) ? categoryParam : undefined;
  const filteredProjects = category
    ? projects.filter((project) => project.category === category)
    : projects;

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const currentPage = Math.min(
    totalPages,
    Math.max(1, Number(pageParam) || 1),
  );
  const pageProjects = filteredProjects.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

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
          <CategoryFilter categories={categories} active={category} basePath="/portfolio" />
          {pageProjects.length > 0 ? (
            <RevealGroup
              key={`${category ?? "all"}-${currentPage}`}
              className={`mt-8 grid gap-6 ${cardGridClass(pageProjects.length)}`}
            >
              {pageProjects.map((project) => (
                <RevealItem key={project.slug}>
                  <ProjectCard project={project} />
                </RevealItem>
              ))}
            </RevealGroup>
          ) : (
            <p className="mt-8 text-center text-muted-foreground">
              No projects in this category yet.
            </p>
          )}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/portfolio"
            query={category ? { category } : undefined}
          />
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
