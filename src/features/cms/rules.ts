/**
 * CMS business rules. Pure functions shared by the editors (which disable a control
 * and say why) and the Server Actions (which enforce). Each check returns a message
 * when the action is not allowed, or null when it is.
 */

export type PublishStatus = "draft" | "published";

/** "Building iLigtas: a story" -> "building-iligtas-a-story". Apostrophes vanish rather than split words. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Lowercase words joined by single hyphens: the same rule the database enforces. */
export const isValidSlug = (value: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);

/** A body is written as text with a blank line between paragraphs; it is stored as an array. */
export function paragraphsFromText(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.replace(/\s*\r?\n\s*/g, " ").trim())
    .filter(Boolean);
}

export const textFromParagraphs = (paragraphs: readonly string[]) => paragraphs.join("\n\n");

export interface PostDraft {
  title: string;
  excerpt: string;
  content: readonly string[];
  imageLight?: string | null;
  imageDark?: string | null;
  imageAlt?: string | null;
}

/** What a post needs before the public can see it. The database repeats the first three as a backstop. */
export function checkPublishPost(post: PostDraft): string | null {
  if (!post.title.trim()) return "Add a title before publishing.";
  if (!post.excerpt.trim())
    return "Add an excerpt before publishing: it is shown in the blog list and in search results.";
  if (post.content.length === 0) return "Write the article before publishing.";
  if ((post.imageLight || post.imageDark) && !post.imageAlt?.trim()) {
    return "Describe the cover image (alt text) before publishing. Screen readers read it.";
  }
  return null;
}

/** Live content is unpublished first, so nothing disappears from the site by accident. */
export function checkDeleteContent(item: { status: PublishStatus }): string | null {
  return item.status === "published"
    ? "Unpublish this first. Published content can't be deleted."
    : null;
}

/** A path on our own site or a full https address; nothing that could run script (javascript:, data:). */
export function isSafeImageSrc(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
