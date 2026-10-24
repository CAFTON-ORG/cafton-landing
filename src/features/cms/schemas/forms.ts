import { z } from "zod";

import { isSafeHref, isSafeImageSrc, isValidSlug } from "../rules/core";

/**
 * The shapes the project, event and partner editors send to the server, and the same shapes
 * they load. Everything is a string, number or boolean the form can hold; the actions turn
 * them into database columns. Every link and image address is checked here, once.
 */

const trimmed = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);
const required = (message: string, max = 200) =>
  z.string().trim().min(1, message).max(max, `Keep this under ${max} characters.`);

const image = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => !value || isSafeImageSrc(value),
    "Use a path on this site (like /images/cover.jpg) or a full https:// address.",
  );

const href = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => !value || isSafeHref(value),
    "Use a path on this site (like /events/my-event) or a full https:// address.",
  );

const slug = z
  .string()
  .trim()
  .min(1, "The web address can't be empty.")
  .max(80, "Keep the web address under 80 characters.")
  .refine(isValidSlug, "Use lowercase letters, numbers and single hyphens, e.g. my-project.");

const dimension = z.coerce
  .number()
  .int()
  .positive(
    "Enter the image's width and height in pixels (choosing it from the library fills them in).",
  );

/* ---------------------------------------------------------------- project */

export const galleryImageSchema = z.object({
  src: image.refine((value) => value.length > 0, "Choose an image."),
  alt: required("Describe this image.", 300),
  width: dimension,
  height: dimension,
  caption: trimmed(300),
});

export const projectSchema = z.object({
  id: z.string().optional(),
  title: required("Give the project a title."),
  slug,
  authorId: z.string().min(1, "Choose who built it."),
  client: required("Add the client or product name.", 120),
  category: required("Add a category.", 60),
  /** Slugs of the service pillars it belongs to. */
  services: z.array(z.string().min(1)).max(8),
  summary: trimmed(400),
  description: trimmed(5000),
  problem: trimmed(3000),
  solution: trimmed(3000),
  recognition: trimmed(1000),
  imageLight: image,
  imageDark: image,
  imageAlt: trimmed(300),
  seoTitle: trimmed(70).default(""),
  seoDescription: trimmed(200).default(""),
  imageFit: z.enum(["", "cover", "contain"]),
  liveUrl: trimmed(500).refine(
    (value) => !value || /^https:\/\//i.test(value),
    "Use a full https:// address.",
  ),
  gallery: z.array(galleryImageSchema).max(30, "A gallery can hold up to 30 images."),
});
export type ProjectInput = z.input<typeof projectSchema>;

/* ------------------------------------------------------------------ event */

export const prizeSchema = z.object({
  rank: required("Say which place or package this is.", 80),
  name: required("Name the prize.", 120),
  /** One item per line. */
  itemsText: trimmed(1000),
  image,
  imageAlt: trimmed(300),
  cutout: z.boolean(),
});

export const eventSchema = z.object({
  id: z.string().optional(),
  title: required("Give the event a title."),
  slug,
  authorId: z.string().min(1, "Choose who posts it."),
  type: required("Add the kind of event, e.g. Giveaway.", 60),
  tagline: trimmed(200),
  seoTitle: trimmed(70).default(""),
  seoDescription: trimmed(200).default(""),
  summary: trimmed(600),
  campaignUrl: trimmed(500).refine(
    (value) => !value || /^https:\/\//i.test(value),
    "Use a full https:// address.",
  ),
  /** "yyyy-MM-ddTHH:mm" in Philippine time, or empty when not announced. */
  startsAt: z
    .string()
    .refine(
      (value) => !value || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value),
      "Pick a start date and time.",
    ),
  endsAt: z
    .string()
    .refine(
      (value) => !value || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value),
      "Pick an end date and time.",
    ),
  closed: z.boolean(),
  posterSrc: image,
  posterAlt: trimmed(300),
  posterWidth: z.union([z.literal(""), dimension]),
  posterHeight: z.union([z.literal(""), dimension]),
  /** Paragraphs separated by a blank line. */
  aboutText: trimmed(10_000),
  prizesHeading: trimmed(120),
  prizes: z.array(prizeSchema).max(20),
  steps: z
    .array(z.object({ title: required("Name the step.", 120), description: trimmed(500) }))
    .max(12),
  facts: z
    .array(z.object({ label: required("Add a label.", 60), value: required("Add a value.", 200) }))
    .max(10),
  closedTitle: trimmed(120),
  closedNote: trimmed(1000),
  promoEyebrow: trimmed(80),
  promoTitle: trimmed(160),
  promoDescription: trimmed(500),
  promoHref: href,
  promoCta: trimmed(60),
});
export type EventInput = z.input<typeof eventSchema>;

/* ---------------------------------------------------------------- partner */

export const partnerSchema = z.object({
  id: z.string().optional(),
  name: required("Add the partner's full name."),
  shortName: required("Add a short name for tight spaces.", 40),
  slug,
  logoSrc: image,
  logoFit: z.enum(["cover", "contain"]),
  /** Tailwind background class for "contain" logos, e.g. bg-white. */
  logoPlate: z
    .string()
    .trim()
    .max(40)
    .regex(/^(|[a-z0-9:/-]+)$/, "Use a plain class name like bg-white."),
  /** Comma separated. */
  rolesText: trimmed(300),
  featured: z.boolean(),
  description: trimmed(1000),
  links: z
    .array(
      z.object({
        label: required("Add link text.", 80),
        href: href.refine((value) => value.length > 0, "Add where it goes."),
      }),
    )
    .max(10),
});
export type PartnerInput = z.input<typeof partnerSchema>;

/* -------------------------------------------------------------------- FAQ */

export const faqSetSchema = z.object({
  serviceSlug: z.string().min(1),
  items: z
    .array(
      z.object({
        question: required("Write the question.", 300),
        answer: required("Write the answer.", 2000),
      }),
    )
    .max(30, "A service can have up to 30 questions."),
});
export type FaqSetInput = z.input<typeof faqSetSchema>;

/* ------------------------------------------------------------ editor data */

export interface AdminProjectDetail {
  id: string;
  title: string;
  slug: string;
  authorId: string;
  client: string;
  category: string;
  services: string[];
  summary: string;
  description: string;
  problem: string;
  solution: string;
  recognition: string;
  imageLight: string;
  imageDark: string;
  imageAlt: string;
  seoTitle: string;
  seoDescription: string;
  imageFit: "" | "cover" | "contain";
  liveUrl: string;
  gallery: { src: string; alt: string; width: number; height: number; caption: string }[];
  status: "draft" | "published";
  updatedAt: string;
}

export interface AdminEventDetail {
  id: string;
  title: string;
  slug: string;
  authorId: string;
  type: string;
  tagline: string;
  seoTitle: string;
  seoDescription: string;
  summary: string;
  campaignUrl: string;
  startsAt: string;
  endsAt: string;
  closed: boolean;
  posterSrc: string;
  posterAlt: string;
  posterWidth: number | "";
  posterHeight: number | "";
  aboutText: string;
  prizesHeading: string;
  prizes: {
    rank: string;
    name: string;
    itemsText: string;
    image: string;
    imageAlt: string;
    cutout: boolean;
  }[];
  steps: { title: string; description: string }[];
  facts: { label: string; value: string }[];
  closedTitle: string;
  closedNote: string;
  promoEyebrow: string;
  promoTitle: string;
  promoDescription: string;
  promoHref: string;
  promoCta: string;
  status: "draft" | "published";
  updatedAt: string;
}

export interface AdminPartnerDetail {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  logoSrc: string;
  logoFit: "cover" | "contain";
  logoPlate: string;
  rolesText: string;
  featured: boolean;
  description: string;
  links: { label: string; href: string }[];
  status: "draft" | "published";
  updatedAt: string;
}

export interface AdminFaq {
  question: string;
  answer: string;
}
