/**
 * Shapes of the site's content. Everything here is plain data, so the same
 * types describe it whether it comes from the files in `src/data` (today) or
 * from an API or database later: only the repositories in
 * `src/lib/repositories` would change.
 */

/** Who made a piece of content. Organization authors (the Cafton team) have no personal profile; person authors can carry an avatar and a link. */
export interface Author {
  id: string;
  kind: "organization" | "person";
  name: string;
  role?: string;
  /** Path or URL of the avatar image. Without one, the avatar falls back to the Cafton mark or the author's initials. */
  avatar?: string;
  /** Public profile page, if the author has one. */
  url?: string;
}

export interface BlogPost {
  slug: string;
  /** Id of the `Author` who wrote the post. */
  authorId: string;
  title: string;
  excerpt: string;
  content: string[];
  date: string;
  /** Drives the blog grid's category filter tabs. */
  category: string;
  /** Optional: posts without a cover render the branded `CoverArt` instead. */
  imageLight?: string;
  imageDark?: string;
  imageAlt?: string;
}

export interface Project {
  /** URL slug -- /portfolio/[slug] */
  slug: string;
  /** Id of the `Author` credited with building it. */
  authorId: string;
  /** Client / product name, e.g. "iLigtas" */
  client: string;
  /** Case-study headline */
  title: string;
  /** Drives the portfolio grid's category filter tabs. */
  category: string;
  /** Short blurb for cards (homepage + portfolio grid) */
  summary: string;
  /** Fuller paragraph for the detail page */
  description: string;
  problem?: string;
  solution?: string;
  recognition?: string;
  /** Optional: projects without a cover render the branded `CoverArt` instead. */
  imageLight?: string;
  imageDark?: string;
  imageAlt?: string;
  /** "cover" (default) crops a screenshot to fill the frame; "contain" shows a logo/mark in full, letterboxed. */
  imageFit?: "cover" | "contain";
  /** Public live URL, if the project has one -- shows a "Visit Live Site" button on the detail page. */
  liveUrl?: string;
}

export type EventStatus = "upcoming" | "open" | "closed";

export interface EventPrize {
  rank: string;
  name: string;
  items: string[];
  /** Items without a photo render a typographic plate instead. */
  image?: string;
  imageAlt?: string;
  /** A transparent cut-out: shown on a studio backdrop instead of filling the plate. */
  cutout?: boolean;
}

export interface EventPromo {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}

export interface EventStep {
  title: string;
  description: string;
}

export interface CaftonEvent {
  slug: string;
  /** Id of the `Author` the event is posted by. */
  authorId: string;
  title: string;
  type: string;
  tagline: string;
  summary: string;
  /** Public Gleam campaign URL; the entry widget is built from it. */
  campaignUrl?: string;
  /** ISO timestamps. Leave out whichever is not announced yet. */
  startsAt?: string;
  endsAt?: string;
  /** Force-close an event regardless of its dates. */
  closed?: boolean;
  /** Without a poster image, one is composed from the event's prize photos. */
  poster?: { src: string; alt: string; width: number; height: number };
  /** Longer description paragraphs, shown as "About the event". */
  about?: string[];
  /** Heading above the prize rows. */
  prizesHeading?: string;
  prizes: EventPrize[];
  steps?: EventStep[];
  /** Replaces the default When / Prizes / Enter facts. */
  facts?: [label: string, value: string][];
  closedTitle?: string;
  closedNote?: string;
  /** A product or service the event ties into, promoted on its page. */
  promo?: EventPromo;
}

export interface PartnerLink {
  label: string;
  href: string;
}

export interface PartnerLogo {
  src: string;
  /** "cover" fills the plate with the logo's own square artwork; "contain" sets a transparent logo on the plate. */
  fit: "cover" | "contain";
  /** Plate colour for "contain" logos. */
  plate?: string;
}

export interface Partner {
  name: string;
  /** Short form for tight placements. */
  shortName: string;
  logo: PartnerLogo;
  /** What the relationship is. Left out where it hasn't been written down yet. */
  roles?: string[];
  /** Gets a full entry (with story and links) even in the dense wall used when there are many partners. */
  featured?: boolean;
  description?: string;
  links?: PartnerLink[];
}
