import type { HomeContent } from "../types/core";

/** The home page's section text as the site said it before it was editable. */
export const home: HomeContent = {
  heroEyebrow: "Software development · Baguio City",
  hero: {
    first: { lead: "Build", accent: "Better." },
    second: { lead: "Solve", accent: "Smarter." },
    text: "Practical software for businesses, organizations, and emerging ventures.",
    contactLabel: "Contact Us",
    workLabel: "Our Work",
    hint: "the mark to build it",
  },
  services: {
    heading: "What we build",
    intro:
      "From a focused internal tool to a full operating system for the business, we tailor the work to the problem.",
    linkLabel: "View all services",
  },
  work: {
    heading: "Built for real problems",
    intro: "Work that begins with a real need and ends with technology people can use.",
    buttonLabel: "View all work",
  },
  writing: {
    heading: "Latest from the blog",
    intro:
      "Notes on how we work, what we're building, and what we're learning along the way.",
    buttonLabel: "Read the blog",
  },
  cta: {
    eyebrow: "Let's talk",
    heading: "Have a problem worth solving?",
    text: "Tell us what you're trying to accomplish. We'll help you figure out what technology can do about it.",
    contactLabel: "Contact Us",
    bookLabel: "Book a call",
  },
};
