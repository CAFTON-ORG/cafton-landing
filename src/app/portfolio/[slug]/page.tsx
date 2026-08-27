import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { getProject, projects } from "@/lib/projects";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  return {
    title: `${project.client} - CAFTON Portfolio`,
    description: project.summary,
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const details = [
    project.problem && { label: "Problem", body: project.problem },
    project.solution && { label: "Solution", body: project.solution },
    project.recognition && { label: "Recognition", body: project.recognition },
  ].filter(Boolean) as { label: string; body: string }[];

  return (
    <>
      <PageHero>
        <PageShell>
          <Link
            href="/portfolio"
            className="mb-6 inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="me-2 size-4" />
            Back to Portfolio
          </Link>
          <RevealGroup>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                {project.title}
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                Built for {project.client}
              </p>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                {project.description}
              </p>
            </RevealItem>
            {project.liveUrl && (
              <RevealItem>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Button className="cursor-pointer group" asChild>
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit Live Site
                      <ArrowUpRight className="ms-2 size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  </Button>
                </div>
              </RevealItem>
            )}
          </RevealGroup>
        </PageShell>
      </PageHero>

      <PageSection>
        <PageShell>
          <Reveal>
            <article className="overflow-hidden rounded-xl border bg-card">
              <div className="relative aspect-[16/9]">
                <Image
                  src={project.imageLight}
                  alt={project.imageAlt}
                  fill
                  sizes="100vw"
                  className="object-cover object-top dark:hidden"
                  priority
                />
                <Image
                  src={project.imageDark}
                  alt={project.imageAlt}
                  fill
                  sizes="100vw"
                  className="hidden object-cover object-top dark:block"
                  priority
                />
              </div>

              {details.length > 0 && (
                <div className="p-7 sm:p-10">
                  <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {details.map(({ label, body }) => (
                      <RevealItem key={label}>
                        <h3 className="font-semibold">{label}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {body}
                        </p>
                      </RevealItem>
                    ))}
                  </RevealGroup>
                </div>
              )}
            </article>
          </Reveal>

        </PageShell>
      </PageSection>

      <ProjectCta />
    </>
  );
}
