import { getDocument } from "@/features/cms/repository/documents";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/motion/reveal";
import { WorkShowcase } from "@/components/marketing/home/work-showcase";
import { listProjects } from "@/features/cms/repository/projects";
import { PageShell } from "@/components/marketing/layout/page-shell";

async function FeaturedWork() {
  const featuredProjects = (await listProjects()).slice(0, 3);
  const { work } = await getDocument("home");
  if (featuredProjects.length === 0) return null;

  return (
    <section
      id="work"
      className="border-y bg-muted/60 py-14 sm:py-16 lg:py-20"
    >
      <PageShell>
        <Reveal className="mb-12 max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {work.heading}
          </h2>
          <p className="text-lg text-muted-foreground">
            {work.intro}
          </p>
        </Reveal>

        <WorkShowcase projects={featuredProjects} />

        <Reveal className="mt-10 flex justify-center">
          <Button variant="outline" className="group cursor-pointer" asChild>
            <Link href="/portfolio">
              {work.buttonLabel}
              <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </Reveal>
      </PageShell>
    </section>
  );
}

export { FeaturedWork };
