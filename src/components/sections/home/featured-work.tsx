"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { getProject } from "@/lib/projects";

const FeaturedWork = () => {
  const project = getProject("iligtas");
  if (!project) return null;

  return (
    <section id="work" className="bg-muted/30 py-14 sm:py-16 lg:py-20">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        {/* Section Header */}
        <Reveal className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Built for real problems
          </h2>
          <p className="text-lg text-muted-foreground">
            Work that begins with a real need and ends with technology people
            can use.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <article className="mx-auto grid max-w-4xl overflow-hidden rounded-xl border bg-card sm:grid-cols-2">
            {/* Real product screenshot (iLigtas's own live geofencing-alerts
                admin view) -- theme-aware light/dark pair already sitting
                in /public, previously unused anywhere in the codebase. */}
            <div className="relative aspect-[4/3] sm:aspect-auto">
              <Image
                src={project.imageLight}
                alt={project.imageAlt}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover object-left-top dark:hidden"
              />
              <Image
                src={project.imageDark}
                alt={project.imageAlt}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="hidden object-cover object-left-top dark:block"
              />
            </div>

            <div className="p-7 sm:p-9">
              <p className="text-sm font-medium text-muted-foreground">
                {project.client}
              </p>
              <h3 className="mt-3 text-2xl font-semibold">{project.title}</h3>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                {project.summary}
              </p>
              {project.recognition && (
                <p className="mt-6 text-sm text-muted-foreground">
                  {project.recognition}
                </p>
              )}
              <Button variant="link" className="mt-5 px-0" asChild>
                <Link href={`/portfolio/${project.slug}`}>
                  View case study <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
};

export { FeaturedWork };
