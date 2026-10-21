import {
  BadgeCheck,
  Handshake,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface CoreValue {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Cafton's core values. One source for the About page and the home page's "Why Cafton" scroll, so they always say the same thing. */
export const coreValues: CoreValue[] = [
  {
    icon: Lightbulb,
    title: "Innovation",
    description:
      "We explore practical and creative ways to solve problems and continuously improve the solutions we develop.",
  },
  {
    icon: ShieldCheck,
    title: "Integrity",
    description:
      "We value honesty, transparency, and accountability in our work, communication, and business relationships.",
  },
  {
    icon: Users,
    title: "Collaboration",
    description:
      "We believe better solutions are developed through teamwork, open communication, and understanding different perspectives.",
  },
  {
    icon: BadgeCheck,
    title: "Quality",
    description:
      "We aim to develop reliable, functional, and easy-to-use software that meets the needs of our clients and their users.",
  },
  {
    icon: RefreshCw,
    title: "Continuous Improvement",
    description:
      "We embrace learning, feedback, and new technologies to strengthen our skills, processes, and services.",
  },
  {
    icon: Handshake,
    title: "Customer Commitment",
    description:
      "We prioritize understanding our clients' goals and providing solutions that address their actual business needs.",
  },
];
