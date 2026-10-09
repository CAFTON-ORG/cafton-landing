import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ThemedImage } from "@/components/shared/themed-image";
import { CoverArt } from "@/components/shared/cover-art";
import { AuthorAvatar } from "@/components/shared/author-avatar";
import { readingTime } from "@/lib/blog";
import type { Author, BlogPost } from "@/types/content";

/**
 * Archive entry: a dated margin column, the headline and excerpt, and a small
 * thumbnail that appears on wider screens. Reads as one ruled line in a
 * journal index rather than a standalone tile.
 */
export function BlogRow({ post, author }: { post: BlogPost; author?: Author }) {
  const date = new Date(post.date);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group grid gap-4 border-b py-8 outline-none transition-colors duration-300 first:border-t hover:bg-muted/30 focus-visible:bg-muted/40 sm:grid-cols-[7rem_1fr] sm:gap-8 md:grid-cols-[7rem_1fr_11rem] md:items-center"
    >
      <time
        dateTime={post.date}
        className="flex items-baseline gap-2 sm:flex-col sm:gap-0"
      >
        <span className="text-4xl font-black leading-none tabular-nums sm:text-5xl">
          {String(date.getUTCDate()).padStart(2, "0")}
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:mt-2">
          {date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          })}
        </span>
      </time>

      <div className="min-w-0">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {post.category} &middot; {readingTime(post)}
        </p>
        <h2 className="mt-2 text-balance text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {post.excerpt}
        </p>
        {author && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <AuthorAvatar author={author} className="size-5" />
            By {author.name}
          </p>
        )}
        <span className="mt-4 inline-flex items-center text-sm font-medium">
          Read more
          <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>

      <div className="relative hidden aspect-4/3 overflow-hidden rounded-lg border bg-muted/40 md:block">
        {post.imageLight && post.imageDark ? (
          <ThemedImage
            light={post.imageLight}
            dark={post.imageDark}
            alt={post.imageAlt ?? ""}
            fill
            sizes="176px"
            className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <CoverArt />
        )}
      </div>
    </Link>
  );
}
