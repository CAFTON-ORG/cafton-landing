import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";

export default function WorkPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Case Studies
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Technology we&apos;ve built around real problems.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            We engineer custom software, web and mobile applications, and SaaS
            products around the way organizations actually work.
          </p>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell>
          <article className="rounded-xl border bg-card p-7 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
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
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <h3 className="font-semibold">Problem</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Preparedness and response information need to reach people
                  where they are.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Solution</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  A connected mobile and web platform for location-aware
                  coordination.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Recognition</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Regional Finalist, Philippine Startup Challenge 9, Cordillera;
                  Finalist, Baguio Smart City Challenge.
                </p>
              </div>
            </div>
          </article>
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
