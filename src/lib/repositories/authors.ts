import { authors } from "@/data/authors";
import type { Author } from "@/types/content";

/**
 * Data access for content authors. These are async on purpose: every page already
 * `await`s them, so moving the content from `src/data` to a backend means
 * changing only the bodies here, not the pages or components that use them.
 */

export async function listAuthors(): Promise<Author[]> {
  return authors;
}

export async function getAuthor(id: string): Promise<Author | undefined> {
  return authors.find((author) => author.id === id);
}

/** Authors keyed by id, for list pages that show a byline on every item. */
export async function getAuthorMap(): Promise<Map<string, Author>> {
  return new Map(authors.map((author) => [author.id, author]));
}
