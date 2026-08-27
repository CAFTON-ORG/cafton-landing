import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ProjectCard } from "@/components/portfolio/project-card";
import { projects } from "@/lib/projects";
import { PageShell } from "@/components/layout/page-shell";
import { cardGridClass } from "@/lib/card-grid";

const featuredProjects = projects.slice(0, 3);

const FeaturedWork = () => {
  if (featuredProjects.length === 0) return null;

  return (
    <section
      id="work"
      className="border-y bg-muted/60 py-14 sm:py-16 lg:py-20"
    >
      <PageShell>
        <Reveal className="mb-12 max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Built for real problems
          </h2>
          <p className="text-lg text-muted-foreground">
            Work that begins with a real need and ends with technology people
            can use.
          </p>
        </Reveal>

        {/* No outer Reveal here: it fades the whole block from opacity 0,
            which masks RevealGroup's own per-card stagger. */}
        <RevealGroup
          className={`grid gap-6 ${cardGridClass(featuredProjects.length)}`}
        >
          {featuredProjects.map((project) => (
            <RevealItem key={project.slug}>
              <ProjectCard project={project} />
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.2} className="mt-10 flex justify-center">
          <Button variant="outline" className="group cursor-pointer" asChild>
            <Link href="/portfolio">
              View all work
              <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </Reveal>
      </PageShell>
    </section>
  );
};

export { FeaturedWork };
