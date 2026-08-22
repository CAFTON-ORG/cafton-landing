import type { Metadata } from "next";
import { HomeHero } from "@/components/sections/home/home-hero";
import { ServicesOverview } from "@/components/sections/home/services-overview";
import { Differentiators } from "@/components/sections/home/differentiators";
import { FeaturedWork } from "@/components/sections/home/featured-work";
import { ProjectCta } from "@/components/sections/home/project-cta";
import { ContactPreview } from "@/components/sections/home/contact-preview";

export const metadata: Metadata = {
  title: "CAFTON - Modern Software Solutions",
  description:
    "CAFTON builds modern software solutions that help teams work smarter. Explore our platform and get in touch with our team.",
  keywords: ["CAFTON", "software company", "saas", "technology"],
  openGraph: {
    title: "CAFTON - Modern Software Solutions",
    description:
      "CAFTON builds modern software solutions that help teams work smarter. Explore our platform and get in touch with our team.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CAFTON - Modern Software Solutions",
    description:
      "CAFTON builds modern software solutions that help teams work smarter. Explore our platform and get in touch with our team.",
  },
};

export default function LandingPage() {
  return (
    <>
      <HomeHero />
      <ServicesOverview />
      <Differentiators />
      <FeaturedWork />
      <ProjectCta />
      {/* <ContactPreview /> */}
    </>
  );
}
