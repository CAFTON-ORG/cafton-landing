import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { JsonLd } from "@/components/shared/json-ld";
import { Button } from "@/components/ui/button";
import { PageHero, PageSection, PageShell } from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { ProjectHeroImage } from "@/components/portfolio/project-hero-image";
import { ProjectStory } from "@/components/portfolio/project-story";
import { RelatedProjects } from "@/components/portfolio/related-projects";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { AdjacentNav, neighbours } from "@/components/shared/adjacent-nav";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Byline } from "@/components/shared/byline";
import { getAuthor } from "@/lib/repositories/authors";
import { getProject, listProjects } from "@/lib/repositories/projects";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await listProjects()).map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};

  return pageMetadata({
    title: `${project.client}: ${project.title}`,
    description: project.summary,
    path: `/portfolio/${project.slug}`,
  });
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const [author, projects] = await Promise.all([getAuthor(project.authorId), listProjects()]);
  const { previous, next } = neighbours(projects, project.slug);
  const more = projects.filter((item) => item.slug !== project.slug).slice(0, 3);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Portfolio", path: "/portfolio" },
          { name: project.client, path: `/portfolio/${project.slug}` },
        ])}
      />
      <PageHero variant="compact">
        <PageShell>
          <Breadcrumbs
            items={[{ name: "Portfolio", href: "/portfolio" }, { name: project.client }]}
          />
          <RevealGroup>
            <RevealItem className="mb-4">
              <Badge variant="outline" className="px-3 py-1 text-sm">{project.category}</Badge>
            </RevealItem>
            <RevealItem>
              <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                {project.title}
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{project.summary}</p>
            </RevealItem>
            <RevealItem className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
              {author && <Byline author={author} label="Built by" />}
              {project.liveUrl && (
                <Button className="group cursor-pointer" asChild>
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                    Visit Live Site
                    <ArrowUpRight className="ms-2 size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                </Button>
              )}
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>

      <PageSection className="pb-0 sm:pb-0 lg:pb-0">
        <PageShell>
          <Reveal>
            <div className="overflow-hidden rounded-xl border">
              <ProjectHeroImage project={project} />
            </div>
          </Reveal>
        </PageShell>
      </PageSection>

      <ProjectStory project={project} />

      <RelatedProjects projects={more} heading="More work" />

      <AdjacentNav
        noun="project"
        previous={previous && { href: `/portfolio/${previous.slug}`, title: previous.client }}
        next={next && { href: `/portfolio/${next.slug}`, title: next.client }}
      />

      <ProjectCta />
    </>
  );
}
