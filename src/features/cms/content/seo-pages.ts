import type { SeoPageDefaults } from "../types";

/**
 * The fixed pages of the public site and what search engines are told about each by default.
 * The dashboard stores only what staff change; anything left empty falls back to this.
 * The home page description comes from the website settings.
 */
export const seoPages: SeoPageDefaults[] = [
  {
    key: "home",
    label: "Home",
    path: "/",
    title: "CAFTON - Software Development in Baguio City, Philippines",
    absoluteTitle: true,
  },
  {
    key: "about",
    label: "About",
    path: "/about",
    title: "About",
    description:
      "Cafton is a software development company in Baguio City helping businesses and organizations solve real problems with practical digital solutions.",
  },
  {
    key: "services",
    label: "Services",
    path: "/services",
    title: "Services",
    description:
      "Business operations, growth, industry, and new-product software, built around the way your organization actually works.",
  },
  {
    key: "portfolio",
    label: "Portfolio",
    path: "/portfolio",
    title: "Portfolio",
    description:
      "Case studies of software Cafton has built around real problems: disaster response, restaurant and retail operations, online elections, and more.",
  },
  {
    key: "blog",
    label: "Blog",
    path: "/blog",
    title: "Blog",
    description:
      "Insights from Cafton on building useful technology: process, engineering, and lessons from real projects.",
  },
  {
    key: "events",
    label: "Events",
    path: "/events",
    title: "Events",
    description:
      "Giveaways, merch drops, and community events from Cafton. See what is open now, what you can win, and how to join.",
  },
  {
    key: "careers",
    label: "Careers",
    path: "/careers",
    title: "Careers",
    description:
      "We are always interested in meeting thoughtful people who care about practical, well-made technology.",
    // No open roles: a thin page that would only be reported as "crawled, not indexed".
    noindex: true,
  },
  {
    key: "contact",
    label: "Contact",
    path: "/contact",
    title: "Contact",
    description:
      "Tell us what you are building, what is not working, or what you would like to improve. We usually reply within one business day.",
  },
  {
    key: "privacy",
    label: "Privacy Policy",
    path: "/privacy",
    title: "Privacy Policy",
    description:
      "How Cafton collects, uses, and protects your personal information, and how we use cookies, under the Data Privacy Act of 2012.",
  },
  {
    key: "legal",
    label: "Legal",
    path: "/legal",
    title: "Legal",
    description:
      "Legal information for Cafton Software Development Services, including business registration details.",
  },
];

/** Nothing is overridden until staff change something. */
export const seoOverrides = { pages: {} };
