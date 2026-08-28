import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DotPattern } from "@/components/shared/dot-pattern";
import { Logo } from "@/components/shared/logo";
import type { BlogPost } from "@/lib/blog";
import { formatBlogDate, readingTime } from "@/lib/blog";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors duration-300 hover:bg-muted/35"
    >
      {/* No cover photography exists per post yet, so the card reuses the
          site's own dot/glow-and-mark visual language (the hero, the CTA
          band) rather than a fabricated screenshot. */}
      <div className="relative aspect-[4/3] overflow-hidden border-b bg-muted/40">
        <DotPattern size="sm" opacity="low" fadeStyle="ellipse" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--foreground)_10%,transparent)_0%,transparent_60%)]"
        />
        <Logo
          aria-hidden="true"
          className="absolute inset-0 m-auto h-16 w-auto text-foreground/10 transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
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
      </div>
    </Link>
  );
}
