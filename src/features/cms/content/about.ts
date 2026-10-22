import type { AboutContent } from "../types";

/** The About page's wording as the site said it before it was editable. */
export const about: AboutContent = {
  hero: {
    eyebrow: "About",
    headlineStart: "Technology should make work",
    headlineEmphasis: "easier",
    headlineEnd: ", not more complicated.",
    intro:
      "Cafton is a software development company in Baguio City. We help businesses, organizations, and emerging ventures improve their operations and serve their customers through practical digital solutions.",
    photo: "/images/cafton-team.jpg",
    photoAlt: "The Cafton team",
  },
  whatWeDo: {
    eyebrow: "What we do",
    heading: "Practical software, built around the problem.",
    paragraphs: [
      "We take time to understand the challenges our clients face, then build solutions that help them manage their processes, reduce manual work, organize information, and improve efficiency.",
      "From improving an existing process to developing a completely new platform, we aim to deliver solutions that are useful, reliable, and built for long-term value.",
    ],
    specialties: [
      "Customized software systems",
      "Web applications",
      "Mobile applications",
      "Digital platforms",
    ],
  },
  story: {
    eyebrow: "Our story",
    heading: "Where the name comes from.",
    nameCaption:
      "CAF is the first letters of our three founders' names. TON completes it into a name that is distinct and easy to remember.",
    chapters: [
      {
        label: "The spark",
        text: "Cafton began with a shared interest in software engineering and a common goal: to use technology to solve real-world problems.",
      },
      {
        label: "Baguio City, 2026",
        text: "It was built on the idea that businesses of different sizes should have access to digital solutions suited to their needs.",
      },
      {
        label: "From vision to practice",
        text: "What started as a shared vision has grown into a business focused on helping clients turn ideas into functional systems and everyday challenges into opportunities for improvement.",
      },
      {
        label: "Today",
        text: "We keep building our foundation through client projects, collaboration, and new software products that can benefit businesses and communities.",
      },
    ],
  },
  vision: {
    eyebrow: "Our vision",
    statement:
      "To become a trusted technology company that transforms ideas and real-world challenges into innovative digital solutions that create lasting value for businesses and communities.",
    mission: {
      initial: "M",
      label: "Our mission",
      text: "To help businesses, organizations, and emerging ventures solve real-world challenges through reliable, user-centered, and innovative digital solutions, combining software engineering and collaborative development to turn ideas into practical products.",
    },
    goal: {
      initial: "G",
      label: "Our goal",
      text: "To establish Cafton as a sustainable software development company that delivers practical and innovative solutions while building long-term client relationships, developing its own products, and contributing to the digital transformation of businesses and communities.",
    },
  },
  approach: {
    eyebrow: "Our approach",
    heading: "How we work.",
    intro:
      "It starts with the problem: how people work today and what could work better tomorrow. Clear thinking and close collaboration guide every stage.",
  },
  help: {
    heading: "Where we can help.",
    intro:
      "Four areas we build in, from the back office to a product that doesn't exist yet.",
    linkLabel: "View all services",
  },
};
