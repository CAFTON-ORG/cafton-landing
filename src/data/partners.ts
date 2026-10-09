import type { Partner } from "@/types/content";

export const partners: Partner[] = [
  {
    name: "Likha Ni Agripipino",
    shortName: "Likano",
    logo: { src: "/partners/likano.webp", fit: "cover" },
    roles: ["Marketing partner"],
  },
  {
    name: "University of Baguio School of Information Technology",
    shortName: "UB SIT",
    logo: { src: "/partners/ub-sit.webp", fit: "contain", plate: "bg-white" },
    roles: ["Sponsor", "Technology partner"],
    featured: true,
    description:
      "Cafton sponsored the Mr. and Ms. Cafton's Choice Award and provides the voting platform behind the school's elections.",
    links: [
      { label: "The award", href: "/events/mr-and-ms-cafton-choice-award" },
      { label: "Cafton Voting App", href: "/portfolio/cafton-voting-app" },
    ],
  },
  {
    name: "Jamil's Mural Arts",
    shortName: "Jamil's",
    logo: { src: "/partners/jamils-mural-arts.webp", fit: "cover" },
    roles: ["Partner"],
    links: [{ label: "The project", href: "/portfolio/jamils-mural-arts" }],
  },
];
