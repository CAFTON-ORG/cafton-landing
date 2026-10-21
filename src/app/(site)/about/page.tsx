import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { PartnersSection } from "@/components/sections/partners";
import { AboutHero } from "@/components/about/hero-section";
import { WhatWeDo } from "@/components/about/what-we-do-section";
import { OurStory } from "@/components/about/story-section";
import { VisionMission } from "@/components/about/vision-section";
import { CoreValues } from "@/components/about/values-section";
import { OurApproach } from "@/components/about/approach-section";
import { WhereWeCanHelp } from "@/components/about/help-section";

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
