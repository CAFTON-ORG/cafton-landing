import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { JsonLd } from "@/components/shared/json-ld";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/marketing/layout/page-shell";
import { ProjectCta } from "@/components/marketing/home/project-cta";
import { RelatedProjects } from "@/components/marketing/portfolio/related-projects";
import { ServiceFaq } from "@/components/marketing/services/service-faq";
import { ServiceSystems } from "@/components/marketing/services/service-systems";
import { PillarIllustration } from "@/components/marketing/services/pillar-illustrations";
import { AdjacentNav, neighbours } from "@/components/marketing/patterns/adjacent-nav";
import { Breadcrumbs } from "@/components/marketing/patterns/breadcrumbs";
import { DotPattern } from "@/components/marketing/decor/dot-pattern";
import { RevealGroup, RevealItem } from "@/components/marketing/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { getServiceFaqs } from "@/features/cms/repository/service-faqs";
import { listProjectsForService } from "@/features/cms/repository/projects";
import { getServicePillar, servicePillars } from "@/config/services";

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

  const related = await listProjectsForService(pillar.slug);
  const faqs = await getServiceFaqs(pillar.slug);
  const { previous, next } = neighbours(servicePillars, pillar.slug);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Services", path: "/services" },
          { name: pillar.title, path: `/services/${pillar.slug}` },
        ])}
      />
      <PageHero
        variant="compact"
        image={
          <div className="relative size-full overflow-hidden rounded-xl border bg-background/60">
            <DotPattern size="sm" opacity="low" fadeStyle="none" />
            <PillarIllustration
              slug={pillar.slug}
              className="absolute inset-0 size-full"
              aria-hidden="true"
            />
          </div>
        }
      >
        <Breadcrumbs
          items={[{ name: "Services", href: "/services" }, { name: pillar.title }]}
        />
        <RevealGroup>
          <RevealItem className="mb-4 flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1 text-sm">Services</Badge>
            <pillar.icon className="size-6 text-foreground" aria-hidden="true" />
          </RevealItem>
          <RevealItem>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              {pillar.title}
            </h1>
          </RevealItem>
          <RevealItem>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">{pillar.summary}</p>
          </RevealItem>
          <RevealItem>
            <div className="mt-8">
              <Button className="group cursor-pointer" asChild>
                <Link href={`/contact?category=${pillar.slug}`}>
                  Talk to us about this
                  <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </RevealItem>
        </RevealGroup>
      </PageHero>

      <ServiceSystems systems={pillar.systems} />

      <RelatedProjects projects={related} heading="Related work" />

      <ServiceFaq items={faqs} />

      <AdjacentNav
        noun="service"
        previous={previous && { href: `/services/${previous.slug}`, title: previous.title }}
        next={next && { href: `/services/${next.slug}`, title: next.title }}
      />

      <ProjectCta />
    </>
  );
}
