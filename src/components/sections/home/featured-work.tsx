import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { ProjectCard } from "@/components/portfolio/project-card";
import { projects } from "@/lib/projects";

const featuredProjects = projects.slice(0, 3);

const FeaturedWork = () => {
  if (featuredProjects.length === 0) return null;

  return (
    <section id="work" className="bg-muted/30 py-14 sm:py-16 lg:py-20">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        {/* Section Header */}
        <Reveal className="mb-12 flex flex-col justify-between gap-6 border-b pb-8 sm:mb-14 sm:flex-row sm:items-end sm:gap-10">
          <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
            Built for real problems
          </h2>
          <p className="max-w-md text-base leading-7 text-muted-foreground sm:text-right">
            Work that begins with a real need and ends with technology people
            can use.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProjects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </Reveal>

        <Reveal delay={0.2} className="mt-10 flex justify-center">
          <Button variant="outline" className="group cursor-pointer" asChild>
            <Link href="/portfolio">
              View all work
              <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
};

export { FeaturedWork };
