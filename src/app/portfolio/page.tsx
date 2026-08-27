import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

export default function WorkPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Case Studies
              </p>
            </RevealItem>
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
          <Reveal>
            <article className="rounded-xl border bg-card p-7 sm:p-10">
              <p className="text-sm font-medium text-muted-foreground">
                iLigtas
              </p>
              <h2 className="mt-3 text-3xl font-bold">
                Disaster Preparedness & Emergency Response
              </h2>
              <p className="mt-5 max-w-3xl text-muted-foreground">
                A platform designed to support disaster preparedness and emergency
                response through mobile technology, geofencing, location-based
                services, and web-based administration.
              </p>
              <RevealGroup className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <RevealItem>
                  <h3 className="font-semibold">Problem</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Preparedness and response information need to reach people
                    where they are.
                  </p>
                </RevealItem>
                <RevealItem>
                  <h3 className="font-semibold">Solution</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    A connected mobile and web platform for location-aware
                    coordination.
                  </p>
                </RevealItem>
                <RevealItem>
                  <h3 className="font-semibold">Recognition</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Regional Finalist, Philippine Startup Challenge 9, Cordillera;
                    Finalist, Baguio Smart City Challenge.
                  </p>
                </RevealItem>
              </RevealGroup>
            </article>
          </Reveal>
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
