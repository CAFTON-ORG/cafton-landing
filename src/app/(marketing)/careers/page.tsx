import type { Metadata } from "next";
import { pageSeo } from "@/features/cms/repository/seo";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/marketing/layout/page-shell";
import { ProjectCta } from "@/components/marketing/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { getSiteSettings } from "@/features/cms/repository/site";
import { getCareers } from "@/features/cms/repository/documents";

export async function generateMetadata(): Promise<Metadata> {
  return pageSeo("careers");
}

export default async function CareersPage() {
  const [{ email }, careers] = await Promise.all([getSiteSettings(), getCareers()]);
  const mailto = (subject: string) => `mailto:${email}?subject=${encodeURIComponent(subject)}`;

  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem className="mb-4">
              <Badge variant="outline" className="px-3 py-1 text-sm">{careers.eyebrow}</Badge>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                {careers.heading}
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                {careers.intro}
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell className="max-w-3xl">
          {careers.roles.length > 0 ? (
            <Reveal>
              <h2 className="text-2xl font-semibold">Open roles</h2>
              <ul className="mt-6 grid gap-4">
                {careers.roles.map((role) => (
                  <li key={role.title} className="rounded-xl border bg-card p-5">
                    <h3 className="text-lg font-semibold">{role.title}</h3>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {role.type} · {role.location}
                    </p>
                    <p className="mt-3 text-muted-foreground">{role.summary}</p>
                    <Button asChild variant="outline" className="mt-4 cursor-pointer">
                      <Link href={mailto(`Application: ${role.title}`)}>Apply for this role</Link>
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-muted-foreground">
                {careers.emptyText}{" "}
                <Link
                  href={mailto("Careers at Cafton")}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  {careers.buttonLabel}
                </Link>
              </p>
            </Reveal>
          ) : (
            <Reveal>
              <h2 className="text-2xl font-semibold">{careers.emptyTitle}</h2>
              <p className="mt-3 text-muted-foreground">
                {careers.emptyText}
              </p>
              <Button asChild className="mt-6 cursor-pointer">
                <Link href={mailto("Careers at Cafton")}>
                  {careers.buttonLabel}
                </Link>
              </Button>
            </Reveal>
          )}
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
