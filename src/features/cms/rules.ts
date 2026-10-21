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

/* ------------------------------------------------------------------ links */

/** A link target: a path on this site or a full https address. Never `javascript:`, `data:` or protocol-relative. */
export function isSafeHref(value: string): boolean {
  return isSafeImageSrc(value);
}

/* ---------------------------------------------------------------- lists */

/** One item per line, blank lines dropped. */
export const listFromText = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

export const textFromList = (items: readonly string[]) => items.join("\n");

/** "Marketing partner, Sponsor" -> ["Marketing partner", "Sponsor"]. */
export const listFromCommas = (text: string): string[] =>
  text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/* -------------------------------------------------------------- date/time */

/**
 * Events are announced in Philippine time, and the site formats them in it too. The
 * Philippines has no daylight saving, so a fixed +08:00 offset is exact.
 */
const MANILA = "+08:00";
const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** "2026-10-01T09:00" (a datetime-local value, Manila time) -> "2026-10-01T09:00:00+08:00", or null if it is not one. */
export function manilaToIso(local: string): string | null {
  if (!LOCAL.test(local)) return null;
  const iso = `${local}:00${MANILA}`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

/** An ISO timestamp -> the "yyyy-MM-ddTHH:mm" a datetime-local input wants, in Manila time. */
export function isoToManila(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

export function checkEventDates(startsAt?: string | null, endsAt?: string | null): string | null {
  if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt))
    return "The event can't end before it starts.";
  return null;
}

/* ----------------------------------------------------- publish completeness */

export function checkPublishProject(project: {
  title: string;
  client: string;
  summary: string;
  description: string;
  imageLight?: string | null;
  imageDark?: string | null;
  imageAlt?: string | null;
}): string | null {
  if (!project.title.trim()) return "Add a title before publishing.";
  if (!project.client.trim()) return "Add the client or product name before publishing.";
  if (!project.summary.trim())
    return "Add a short summary before publishing: it is shown on the project cards.";
  if (!project.description.trim())
    return "Add a description before publishing: it is the main text of the project page.";
  if ((project.imageLight || project.imageDark) && !project.imageAlt?.trim()) {
    return "Describe the cover image (alt text) before publishing. Screen readers read it.";
  }
  return null;
}

export function checkPublishEvent(event: {
  title: string;
  tagline: string;
  summary: string;
  prizeCount: number;
}): string | null {
  if (!event.title.trim()) return "Add a title before publishing.";
  if (!event.tagline.trim()) return "Add a tagline before publishing.";
  if (!event.summary.trim())
    return "Add a summary before publishing: it is shown on the events list.";
  if (event.prizeCount === 0) return "Add at least one prize before publishing.";
  return null;
}

export function checkPublishPartner(partner: {
  name: string;
  shortName: string;
  logoSrc: string;
}): string | null {
  if (!partner.name.trim() || !partner.shortName.trim())
    return "Add the partner's name and short name before publishing.";
  if (!partner.logoSrc.trim()) return "Choose a logo before publishing.";
  return null;
}
