import { blogPosts } from "@/features/cms/content/blog-posts";
import type { BlogPost } from "@/features/cms/types";

/**
 * Data access for blog posts. These are async on purpose: every page already
 * `await`s them, so moving the content from `features/cms/content` to a backend means
 * changing only the bodies here, not the pages or components that use them.
 */

/** Newest first. */
export async function listBlogPosts(): Promise<BlogPost[]> {
  return [...blogPosts].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  return blogPosts.find((post) => post.slug === slug);
}
