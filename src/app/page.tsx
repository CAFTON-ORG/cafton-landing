import type { Metadata } from "next";
import { HomeHero } from "@/components/sections/home/home-hero";
import { ServicesOverview } from "@/components/sections/home/services-overview";
import { Differentiators } from "@/components/sections/home/differentiators";
import { FeaturedWork } from "@/components/sections/home/featured-work";
import { LatestWriting } from "@/components/sections/home/latest-writing";
import { ProjectCta } from "@/components/sections/home/project-cta";

// Only title/description/keywords are overridden here. Next.js merges
// simple metadata fields per route, but replaces nested objects like
// openGraph/twitter wholesale rather than merging them -- redefining
// those here would drop the share image already set in the root layout.
export const metadata: Metadata = {
  title: "CAFTON - Modern Software Solutions",
  description:
    "CAFTON builds modern software solutions that help teams work smarter. Explore our platform and get in touch with our team.",
  keywords: ["CAFTON", "software company", "saas", "technology"],
};

export default function LandingPage() {
  return (
    <>
      <HomeHero />
      <ServicesOverview />
      <Differentiators />
      <FeaturedWork />
      <LatestWriting />
      <ProjectCta />
    </>
  );
}
