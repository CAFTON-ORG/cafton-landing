/**
 * Shapes of the site's content. Everything here is plain data, so the same
 * types describe it whether it comes from the files in `features/cms/content` (today) or
 * from an API or database later: only the repositories in
 * `features/cms/repository` would change.
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

/** A photo inside a post. Width and height are the file's own, so the page reserves its space before it loads. */
export interface BlogImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

/** One or more photos placed in the article, shown as a single figure or a grid with a lightbox. */
export interface BlogMedia {
  /** Index of the paragraph this sits after (0 = after the first paragraph). */
  after: number;
  images: BlogImage[];
  /** Caption for the whole set; a single image can use its own. */
  caption?: string;
}

export interface BlogPost {
  slug: string;
  /** Id of the `Author` who wrote the post. */
  authorId: string;
  title: string;
  excerpt: string;
  content: string[];
  /** Photos and galleries placed between paragraphs. */
  media?: BlogMedia[];
  date: string;
  /** Drives the blog grid's category filter tabs. */
  category: string;
  /** Optional: posts without a cover render the branded `CoverArt` instead. */
  imageLight?: string;
  imageDark?: string;
  imageAlt?: string;
  /** Search-engine title and description for this item; empty uses its own title and text. */
  seoTitle?: string;
  seoDescription?: string;
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
  /** Slugs of the service pillars this project falls under; drives "related work" on service pages. */
  services: string[];
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
  /** Search-engine title and description for this item; empty uses its own title and text. */
  seoTitle?: string;
  seoDescription?: string;
  /** "cover" (default) crops a screenshot to fill the frame; "contain" shows a logo/mark in full, letterboxed. */
  imageFit?: "cover" | "contain";
  /** More screenshots, shown as a gallery on the detail page. */
  media?: BlogImage[];
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
  /** Search-engine title and description for this item; empty uses its own title and text. */
  seoTitle?: string;
  seoDescription?: string;
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

export interface FaqItem {
  question: string;
  answer: string;
}

/** The social networks the site can link to. The icon and the label come from the code. */
export type SocialPlatform = "facebook" | "instagram" | "linkedin" | "tiktok" | "x" | "youtube";

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

/** Facts about the company that appear in several places (footer, contact, legal pages, search results). */
export interface SiteSettings {
  /** Default description in search results and link previews, for pages with none of their own. */
  description: string;
  /** The footer's two-line slogan, one line per item. */
  tagline: string[];
  /** The short paragraph under the slogan in the footer. */
  footerBlurb: string;
  email: string;
  /** Shown as "City, Country". */
  city: string;
  country: string;
  /** ISO 3166-1 alpha-2, for search-engine data. */
  countryCode: string;
  /** Year the company was founded. */
  established: string;
  /** Where "Book a call" goes. */
  bookingUrl: string;
  /** Short badges such as "Est. 2026", shown under the home and about headlines. */
  facts: string[];
  socials: SocialLink[];
}

/** What search engines are told about a fixed page when nothing has been changed. */
export interface SeoPageDefaults {
  key: string;
  label: string;
  path: string;
  title: string;
  /** Leave out to use the site description (the home page). */
  description?: string;
  /** Use the title exactly, without the site name added after it. */
  absoluteTitle?: boolean;
  /** Hidden from search by default. */
  noindex?: boolean;
}

/** The share image shown when the page is posted on social media. */
export interface SeoImage {
  url: string;
  width: number;
  height: number;
}

/** What staff changed for one page. Anything left out keeps its default. */
export interface SeoOverride {
  title?: string;
  description?: string;
  /** true hides the page from search, false shows one that is hidden by default. */
  noindex?: boolean;
  image?: SeoImage;
}

export interface SeoDocument {
  pages: Record<string, SeoOverride>;
}

/* ------------------------------------------------------------------ careers */

export interface CareerRole {
  title: string;
  /** Full-time, part-time, internship... */
  type: string;
  location: string;
  summary: string;
}

export interface CareersContent {
  eyebrow: string;
  heading: string;
  intro: string;
  /** Shown when there are no open roles. */
  emptyTitle: string;
  emptyText: string;
  buttonLabel: string;
  roles: CareerRole[];
}

/* ------------------------------------------------------------ services, values */

export interface ServiceSystem {
  title: string;
  description: string;
}

/** One service area. The slug is its web address and never changes; the rest is editable. */
export interface ServiceContent {
  slug: string;
  title: string;
  /** Short line for cards and grids. */
  tagline: string;
  /** Longer paragraph for the detail page. */
  summary: string;
  /** A photo or drawing to show instead of the built-in illustration. Optional. */
  image?: string;
  imageAlt?: string;
  systems: ServiceSystem[];
}

export const VALUE_ICON_NAMES = [
  "lightbulb",
  "shield-check",
  "users",
  "badge-check",
  "refresh",
  "handshake",
] as const;
export type ValueIcon = (typeof VALUE_ICON_NAMES)[number];

export interface CoreValueContent {
  icon: ValueIcon;
  title: string;
  description: string;
}

export interface ServicesDocument {
  eyebrow: string;
  heading: string;
  intro: string;
  pillars: ServiceContent[];
}

export interface ValuesDocument {
  heading: string;
  intro: string;
  items: CoreValueContent[];
}

/* ----------------------------------------------------------- privacy, legal */

/** One titled section of a long document. `body` uses the small text format of `rich-text.tsx`. */
export interface PolicySection {
  /** Web anchor; empty uses the title. */
  id: string;
  title: string;
  body: string;
}

export interface PolicyDocument {
  eyebrow: string;
  heading: string;
  intro: string;
  lastUpdated: string;
  sections: PolicySection[];
}

export interface LegalRegistration {
  name: string;
  status: string;
  detail: string;
  /** Optional seal or badge. */
  image: string;
  imageAlt: string;
}

export interface LegalDocument {
  eyebrow: string;
  heading: string;
  registrations: LegalRegistration[];
  sections: PolicySection[];
}

/* ------------------------------------------------------------- about, home */

export interface AboutContent {
  hero: {
    eyebrow: string;
    headlineStart: string;
    headlineEmphasis: string;
    headlineEnd: string;
    intro: string;
    photo: string;
    photoAlt: string;
  };
  whatWeDo: { eyebrow: string; heading: string; paragraphs: string[]; specialties: string[] };
  story: {
    eyebrow: string;
    heading: string;
    nameCaption: string;
    chapters: { label: string; text: string }[];
  };
  vision: {
    eyebrow: string;
    statement: string;
    mission: { initial: string; label: string; text: string };
    goal: { initial: string; label: string; text: string };
  };
  approach: { eyebrow: string; heading: string; intro: string };
  help: { heading: string; intro: string; linkLabel: string };
}

export interface HomeContent {
  heroEyebrow: string;
  services: { heading: string; intro: string; linkLabel: string };
  work: { heading: string; intro: string; buttonLabel: string };
  writing: { heading: string; intro: string; buttonLabel: string };
  cta: {
    eyebrow: string;
    heading: string;
    text: string;
    contactLabel: string;
    bookLabel: string;
  };
}

export interface ContactContent {
  eyebrow: string;
  heading: string;
  intro: string;
  email: { heading: string; text: string; buttonLabel: string };
  expect: { heading: string; text: string; note: string };
  faqHeading: string;
}
