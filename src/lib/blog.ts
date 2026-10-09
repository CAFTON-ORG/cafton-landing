import type { BlogPost } from "@/types/content";

export function formatBlogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function readingTime(post: BlogPost): string {
  const words = post.content.join(" ").trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}
