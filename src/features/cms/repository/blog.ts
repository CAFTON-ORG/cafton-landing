import { z } from "zod";

import { blogPosts } from "@/features/cms/content/blog-posts";
import { blogMediaSchema, parseJson } from "@/features/cms/schemas";
import type { BlogMedia, BlogPost } from "@/features/cms/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { opt, publicRows, readContent } from "./source";

/**
 * Data access for blog posts. Async on purpose: pages already `await` them.
 * Reads the database once it has content, the bundled content before that (see `source.ts`).
 */

function toBlogPost(row: Prisma.BlogPostGetPayload<object>): BlogPost {
  const media = parseJson(z.array(blogMediaSchema), row.media, [] as BlogMedia[], `media of post ${row.slug}`);
  return {
    slug: row.slug,
    authorId: row.authorId,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    ...(media.length > 0 && { media }),
    date: row.date.toISOString().slice(0, 10),
    category: row.category,
    imageLight: opt(row.imageLight),
    imageDark: opt(row.imageDark),
    imageAlt: opt(row.imageAlt),
  };
}

/** Newest first. */
export async function listBlogPosts(): Promise<BlogPost[]> {
  return readContent(
    "blog posts",
    {
      populated: () => prisma.blogPost.count(),
      query: async () => {
        const rows = await prisma.blogPost.findMany({
          where: publicRows,
          orderBy: [{ date: "desc" }, { position: "asc" }, { createdAt: "asc" }],
        });
        return rows.map(toBlogPost);
      },
    },
    () => [...blogPosts].sort((a, b) => b.date.localeCompare(a.date)),
  );
}

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  return (await listBlogPosts()).find((post) => post.slug === slug);
}
