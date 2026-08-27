import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

const partnerships = [
  "Technology Partnerships",
  "Project Partnerships",
  "Institutional Partnerships",
  "Business Partnerships",
  "Product Partnerships",
];

export default function PartnershipsPage() {
  return (
    <>
      <PageHero>
        <PageShell>
          <RevealGroup>
            <RevealItem>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Partnerships
              </p>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Let&apos;s build something together.
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                Cafton works with organizations, technology providers, institutions,
                and businesses to develop and deploy technology that creates
                practical value.
              </p>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>
      <PageSection>
        <PageShell>
          <Reveal>
            <h2 className="text-3xl font-bold">We are open to</h2>
          </Reveal>
          <RevealGroup className="mt-8 grid gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
            {partnerships.map((item) => (
              <RevealItem key={item} className="border-t border-border pt-5">
                <h3 className="font-semibold">{item}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Collaboration grounded in shared goals and useful technology.
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
          <Button asChild className="mt-10 cursor-pointer">
            <Link href="/contact">Discuss a Partnership</Link>
          </Button>
        </PageShell>
      </PageSection>
      <ProjectCta />
    </>
  );
}
