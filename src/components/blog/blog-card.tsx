import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog";
import { formatBlogDate, readingTime } from "@/lib/blog";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col rounded-xl border bg-card p-6 transition-colors duration-300 hover:bg-muted/35 sm:p-7"
    >
      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
        <span aria-hidden="true">&middot;</span>
        <span>{readingTime(post)}</span>
      </div>
      <h3 className="mt-3 text-xl font-semibold leading-tight tracking-[-0.02em]">
        {post.title}
      </h3>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {post.excerpt}
      </p>
      <span className="mt-auto inline-flex items-center pt-8 text-sm font-medium text-foreground">
        Read more
        <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
