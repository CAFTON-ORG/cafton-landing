import { z } from "zod";

import { isSafeImageSrc, isValidSlug } from "../rules";

const optionalImage = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => !value || isSafeImageSrc(value),
    "Use a path on this site (like /images/cover.jpg) or a full https:// address.",
  );

export const postSchema = z.object({
  id: z.string().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Give the post a title.")
    .max(200, "Keep the title under 200 characters."),
  slug: z
    .string()
    .trim()
    .min(1, "The web address can't be empty.")
    .max(80, "Keep the web address under 80 characters.")
    .refine(isValidSlug, "Use lowercase letters, numbers and single hyphens, e.g. my-first-post."),
  authorId: z.string().min(1, "Choose who wrote it."),
  category: z
    .string()
    .trim()
    .min(1, "Add a category.")
    .max(60, "Keep the category under 60 characters."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date shown on the post."),
  excerpt: z.string().trim().max(400, "Keep the excerpt under 400 characters."),
  /** Paragraphs separated by a blank line. */
  body: z.string().max(60_000, "That's longer than the editor supports."),
  imageLight: optionalImage,
  imageDark: optionalImage,
  imageAlt: z.string().trim().max(300),
});

export type PostInput = z.input<typeof postSchema>;

export const publishIntents = ["save", "publish", "unpublish"] as const;
export type PublishIntent = (typeof publishIntents)[number];
