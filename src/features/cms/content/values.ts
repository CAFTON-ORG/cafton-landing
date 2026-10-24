import type { CoreValueContent, ValuesDocument } from "../types/core";

/** Cafton's core values as the site said them before they were editable. */
export const coreValueContent: CoreValueContent[] = [
  {
    icon: "lightbulb",
    title: "Innovation",
    description:
      "We explore practical and creative ways to solve problems and continuously improve the solutions we develop.",
  },
  {
    icon: "shield-check",
    title: "Integrity",
    description:
      "We value honesty, transparency, and accountability in our work, communication, and business relationships.",
  },
  {
    icon: "users",
    title: "Collaboration",
    description:
      "We believe better solutions are developed through teamwork, open communication, and understanding different perspectives.",
  },
  {
    icon: "badge-check",
    title: "Quality",
    description:
      "We aim to develop reliable, functional, and easy-to-use software that meets the needs of our clients and their users.",
  },
  {
    icon: "refresh",
    title: "Continuous Improvement",
    description:
      "We embrace learning, feedback, and new technologies to strengthen our skills, processes, and services.",
  },
  {
    icon: "handshake",
    title: "Customer Commitment",
    description:
      "We prioritize understanding our clients' goals and providing solutions that address their actual business needs.",
  },
];;

/** What the Core values section says around the list, on the About page and in the home scroll. */
export const valuesDocument: ValuesDocument = {
  heading: "What guides our work.",
  intro: "Six commitments we hold ourselves to, on every project and in every conversation.",
  items: coreValueContent,
};
