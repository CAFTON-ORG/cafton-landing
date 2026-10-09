import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { JsonLd } from "@/components/shared/json-ld";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageHero,
  PageSection,
  PageShell,
} from "@/components/layout/page-shell";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { getServicePillar, servicePillars } from "@/lib/services";

interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return servicePillars.map((pillar) => ({ slug: pillar.slug }));
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const pillar = getServicePillar(slug);
  if (!pillar) return {};

  return pageMetadata({
    title: pillar.title,
    description: pillar.summary,
    path: `/services/${pillar.slug}`,
  });
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const pillar = getServicePillar(slug);
  if (!pillar) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Services", path: "/services" },
          { name: pillar.title, path: `/services/${pillar.slug}` },
        ])}
      />
      <PageHero>
        <PageShell>
          <Link
            href="/services"
            className="mb-6 inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="me-2 size-4" />
            Back to Services
          </Link>
          <RevealGroup>
            <RevealItem className="mb-4">
              <Badge variant="outline" className="px-3 py-1 text-sm">Services</Badge>
            </RevealItem>
            <RevealItem>
              <pillar.icon className="size-8 text-foreground" aria-hidden="true" />
            </RevealItem>
            <RevealItem>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                {pillar.title}
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                {pillar.summary}
              </p>
            </RevealItem>
            <RevealItem>
              <div className="mt-8">
                <Button className="cursor-pointer group" asChild>
                  <Link href={`/contact?category=${pillar.slug}`}>
                    Talk to us about this
                    <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </RevealItem>
          </RevealGroup>
        </PageShell>
      </PageHero>

      <PageSection>
        <PageShell className="max-w-4xl">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight">What&apos;s inside</h2>
          </Reveal>
          <RevealGroup className="mt-8 flex flex-col">
            {pillar.systems.map((system) => (
              <RevealItem
                key={system.title}
                className="border-t border-border py-6 first:border-t-0 first:pt-0"
              >
                <h2 className="text-lg font-semibold">{system.title}</h2>
                <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
                  {system.description}
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </PageShell>
      </PageSection>

      <ProjectCta />
    </>
  );
}
