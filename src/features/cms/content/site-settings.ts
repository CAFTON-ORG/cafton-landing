import type { SiteSettings } from "../types/core";

/** What the site said before settings were editable. The seed copies it into the database. */
export const siteSettings: SiteSettings = {
  description:
    "Cafton builds custom software, web apps, and mobile apps for businesses and organizations. Based in Baguio City, serving clients across the Philippines.",
  tagline: ["Build Better.", "Solve Smarter."],
  footerBlurb:
    "A software development company in Baguio City, building practical systems for businesses, organizations, and new ventures.",
  email: "contact@cafton.com",
  city: "Baguio City",
  country: "Philippines",
  countryCode: "PH",
  established: "2026",
  bookingUrl: "https://calendly.com/cafton-company/consultation",
  facts: ["Est. 2026", "Baguio City", "Remote, nationwide"],
  socials: [
    { platform: "facebook", url: "https://www.facebook.com/profile.php?id=61593222069389" },
    { platform: "instagram", url: "https://www.instagram.com/cafton.official" },
    { platform: "linkedin", url: "https://www.linkedin.com/company/cafton" },
    { platform: "tiktok", url: "https://www.tiktok.com/@cafton.official" },
    { platform: "x", url: "https://x.com/cafton_official" },
    { platform: "youtube", url: "https://www.youtube.com/@caftonofficial" },
  ],
};
