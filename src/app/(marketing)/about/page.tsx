import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ProjectCta } from "@/components/marketing/home/project-cta";
import { PartnersSection } from "@/components/marketing/partners/partners-section";
import { AboutHero } from "@/components/marketing/about/hero-section";
import { WhatWeDo } from "@/components/marketing/about/what-we-do-section";
import { OurStory } from "@/components/marketing/about/story-section";
import { VisionMission } from "@/components/marketing/about/vision-section";
import { CoreValues } from "@/components/marketing/about/values-section";
import { OurApproach } from "@/components/marketing/about/approach-section";
import { WhereWeCanHelp } from "@/components/marketing/about/help-section";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "Cafton is a software development company in Baguio City helping businesses and organizations solve real problems with practical digital solutions.",
  path: "/about",
});

export default function About() {
  return (
    <>
      <AboutHero />
      <WhatWeDo />
      <OurStory />
      <VisionMission />
      <CoreValues />
      <OurApproach />
      <PartnersSection />
      <WhereWeCanHelp />
      <ProjectCta />
    </>
  );
}
