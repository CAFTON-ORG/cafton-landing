/** Tags: short free-form labels on leads, contacts, organizations and deals. */

export const MAX_TAGS = 15;
export const MAX_TAG_LENGTH = 30;

/**
 * Cleans a list of tags the way people mean them: trimmed, lower case, inner spaces collapsed,
 * no commas, at most 30 characters, no repeats, at most 15 of them.
 */
export function normalizeTags(input: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const raw of input) {
    const tag = raw
      .replace(/[,;]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .slice(0, MAX_TAG_LENGTH)
      .trim();
    if (tag) seen.add(tag);
    if (seen.size >= MAX_TAGS) break;
  }
  return [...seen];
}

/** "vip, follow up;Baguio" -> ["vip", "follow up", "baguio"]. */
export const parseTagList = (text: string) => normalizeTags(text.split(/[,;\n]/));

export const TAGGABLE = ["lead", "contact", "organization", "deal"] as const;
export type Taggable = (typeof TAGGABLE)[number];
