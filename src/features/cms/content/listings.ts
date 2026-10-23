import type { ListingsDocument, PartnerCopy } from "../types";

/** The heading text of the blog, portfolio and events pages, as the site said it before it was editable. */
export const listings: ListingsDocument = {
  blog: {
    eyebrow: "Blog",
    heading: "Insights from Cafton.",
    intro:
      "Thoughts on process, engineering, and what we learn building software around real problems.",
    empty: "No posts in this category yet.",
  },
  portfolio: {
    eyebrow: "Portfolio",
    heading: "Technology we've built around real problems.",
    intro:
      "We engineer custom software, web and mobile applications, and SaaS products around the way organizations actually work.",
    empty: "No projects in this category yet.",
  },
  events: {
    eyebrow: "Events",
    heading: "Giveaways and community events.",
    intro: "See what is open right now, what you can win, and how to take part.",
    openHeading: "Open and upcoming",
    pastHeading: "Past events",
    moreHeading: "More events",
    moreText: "More events are on the way. Follow our social channels to hear about them first.",
  },
};

export const partnerCopy: PartnerCopy = {
  section: {
    eyebrow: "Partners and sponsorships",
    heading: "Backing the communities we build for.",
    text: "Beyond client work, we show up as a sponsor and a technology partner for the organizations around us.",
    allLabel: "All partners",
    askText:
      "Running an event, a school program, or a community project that could use a technology partner?",
    askLabel: "Partner with us",
  },
  strip: {
    eyebrow: "Partners and sponsorships",
    heading: "In good company, and giving back.",
    text: "The organizations we build with and stand behind.",
    linkLabel: "Meet our partners",
  },
};
