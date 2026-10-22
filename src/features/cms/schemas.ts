import { z } from "zod";

/**
 * Shapes of the JSON columns. They are validated when content is read and (in the
 * editors) when it is written, so a malformed edit can never reach a public page
 * as a runtime crash. They mirror the interfaces in `types.ts`.
 */

const text = z.string();

export const blogImageSchema = z.object({
  src: text.min(1),
  alt: text,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: text.optional(),
});

export const blogMediaSchema = z.object({
  after: z.number().int().min(0),
  images: z.array(blogImageSchema).min(1),
  caption: text.optional(),
});

export const eventPrizeSchema = z.object({
  rank: text,
  name: text,
  items: z.array(text),
  image: text.optional(),
  imageAlt: text.optional(),
  cutout: z.boolean().optional(),
});

export const eventStepSchema = z.object({ title: text, description: text });

export const eventPromoSchema = z.object({
  eyebrow: text,
  title: text,
  description: text,
  href: text,
  cta: text,
});

export const eventPosterSchema = z.object({
  src: text.min(1),
  alt: text,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const eventFactsSchema = z.array(z.tuple([text, text]));

export const partnerLogoSchema = z.object({
  src: text.min(1),
  fit: z.enum(["cover", "contain"]),
  plate: text.optional(),
});

export const partnerLinkSchema = z.object({ label: text, href: text });

/**
 * Parses a JSON column. Bad data is logged and replaced by `fallback`, so a page
 * degrades (a missing gallery) instead of failing to render.
 */
export function parseJson<T>(schema: z.ZodType<T>, value: unknown, fallback: T, where: string): T {
  if (value === null || value === undefined) return fallback;
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  console.error(`Ignoring malformed ${where}:`, result.error.issues[0]?.message);
  return fallback;
}

/* ------------------------------------------------------------ site settings */

const httpsUrl = z
  .string()
  .trim()
  .url("Enter a full address starting with https://")
  .refine((value) => value.startsWith("https://"), "The address must start with https://");

export const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "linkedin",
  "tiktok",
  "x",
  "youtube",
] as const;

export const siteSettingsSchema = z.object({
  description: z
    .string()
    .trim()
    .min(20, "Write at least a sentence.")
    .max(300, "Keep it under 300 characters."),
  tagline: z
    .array(z.string().trim().min(1, "Leave no line empty.").max(60))
    .min(1, "Add at least one line.")
    .max(3),
  footerBlurb: z.string().trim().min(1, "Add a short description.").max(300),
  email: z.string().trim().email("Enter a valid email address."),
  city: z.string().trim().min(1, "Enter the city.").max(80),
  country: z.string().trim().min(1, "Enter the country.").max(80),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/, "Two capital letters, e.g. PH."),
  established: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "A four-digit year."),
  bookingUrl: z.union([httpsUrl, z.literal("")]),
  facts: z.array(z.string().trim().min(1, "Leave no badge empty.").max(40)).max(6),
  socials: z
    .array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), url: httpsUrl }))
    .max(SOCIAL_PLATFORMS.length)
    .refine(
      (links) => new Set(links.map((link) => link.platform)).size === links.length,
      "Each network can be listed once.",
    ),
});
