import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";

export default function WorkPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Work
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Technology we&apos;ve built around real problems.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Our work is documented as case studies: the challenge, the thinking,
            and the outcome—not just a gallery of screens.
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
          <div className="mt-12 rounded-xl bg-muted p-8 sm:p-10">
            <h2 className="text-2xl font-bold">
              Have a problem worth solving?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Let&apos;s explore the right product together.
            </p>
            <Button asChild className="mt-6">
              <Link href="/contact">
                Start a Project <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </PageShell>
      </PageSection>
    </>
  );
}
