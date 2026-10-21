import type { Metadata } from "next";
import { SITE_DESCRIPTION, pageMetadata } from "@/lib/seo";
import { HomeHero } from "@/components/sections/home/home-hero";
import { ServicesOverview } from "@/components/sections/home/services-overview";
import { Differentiators } from "@/components/sections/home/differentiators";
import { FeaturedWork } from "@/components/sections/home/featured-work";
import { PartnersStrip } from "@/components/sections/partners";
import { LatestWriting } from "@/components/sections/home/latest-writing";
import { ProjectCta } from "@/components/sections/home/project-cta";

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
