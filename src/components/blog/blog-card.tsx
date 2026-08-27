import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-6 transition-colors hover:border-foreground/20 sm:p-7"
    >
      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
        <span aria-hidden="true">&middot;</span>
        <span>{post.readingTime}</span>
      </div>
      <h3 className="text-xl font-semibold leading-snug">{post.title}</h3>
      <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
        {post.excerpt}
      </p>
      <span className="mt-auto inline-flex items-center pt-2 text-sm font-medium text-foreground">
        Read more
        <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
