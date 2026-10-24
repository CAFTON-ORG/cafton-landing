import "server-only";

import { authors } from "@/features/cms/content/authors";
import type { Author } from "@/features/cms/types/core";
import { prisma } from "@/lib/db";
import { opt, readContent } from "./source";

/**
 * Data access for content authors. Async on purpose: pages already `await` them.
 * Reads the database once it has content, the bundled content before that (see `source.ts`).
 */

export async function listAuthors(): Promise<Author[]> {
  return readContent(
    "authors",
    {
      populated: () => prisma.author.count(),
      query: async () => {
        const rows = await prisma.author.findMany({
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
        return rows.map((row): Author => ({
          id: row.id,
          kind: row.kind,
          name: row.name,
          role: opt(row.role),
          avatar: opt(row.avatar),
          url: opt(row.url),
        }));
      },
    },
    () => authors,
  );
}

export async function getAuthor(id: string): Promise<Author | undefined> {
  return (await listAuthors()).find((author) => author.id === id);
}

/** Authors keyed by id, for list pages that show a byline on every item. */
export async function getAuthorMap(): Promise<Map<string, Author>> {
  return new Map((await listAuthors()).map((author) => [author.id, author]));
}
