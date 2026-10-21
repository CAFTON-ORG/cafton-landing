import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { SITE_DESCRIPTION } from "@/config/site";
import { HomeHero } from "@/components/marketing/home/home-hero";
import { ServicesOverview } from "@/components/marketing/home/services-overview";
import { Differentiators } from "@/components/marketing/home/differentiators";
import { FeaturedWork } from "@/components/marketing/home/featured-work";
import { PartnersStrip } from "@/components/marketing/partners/partners-section";
import { LatestWriting } from "@/components/marketing/home/latest-writing";
import { ProjectCta } from "@/components/marketing/home/project-cta";

export const metadata: Metadata = pageMetadata({
  title: "CAFTON - Software Development in Baguio City, Philippines",
  absoluteTitle: true,
  description: SITE_DESCRIPTION,
  path: "/",
});

export default function LandingPage() {
  return (
    <>
      <HomeHero />
      <ServicesOverview />
      <Differentiators />
      <FeaturedWork />
      <PartnersStrip />
      <LatestWriting />
      <ProjectCta />
    </>
  );
}
