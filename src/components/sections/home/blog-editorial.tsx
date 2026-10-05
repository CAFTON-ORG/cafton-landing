import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ThemedImage } from "@/components/shared/themed-image";
import { CoverArt } from "@/components/shared/cover-art";
import { formatBlogDate, readingTime, type BlogPost } from "@/lib/blog";

/**
 * Cover story + index: the newest post runs as a full-bleed cover with its
 * headline set over the image, the rest follow as a typographic reading list
 * with no images, so the section reads like a magazine spread, not a card row.
 */
export function BlogEditorial({ posts }: { posts: BlogPost[] }) {
  const [cover, ...rest] = posts;

  return (
    <RevealGroup className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
      <RevealItem>
        <Link
          href={`/blog/${cover.slug}`}
          className="group relative flex min-h-96 overflow-hidden rounded-2xl border bg-muted/40 lg:h-full lg:min-h-136"
        >
          {cover.imageLight && cover.imageDark ? (
            <ThemedImage
              light={cover.imageLight}
              dark={cover.imageDark}
              alt={cover.imageAlt ?? ""}
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <CoverArt />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-background/10"
          />
          <div className="relative mt-auto flex flex-col gap-4 p-6 sm:p-8">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Latest &middot; {cover.category} &middot;{" "}
              <time dateTime={cover.date}>{formatBlogDate(cover.date)}</time>
            </p>
            <h3 className="max-w-lg text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {cover.title}
            </h3>
            <p className="line-clamp-2 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
              {cover.excerpt}
            </p>
            <span className="inline-flex items-center text-sm font-medium">
              Read story &middot; {readingTime(cover)}
              <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </div>
        </Link>
      </RevealItem>

      <div className="flex flex-col border-t">
        {rest.map((post, index) => (
          <RevealItem key={post.slug} className="flex-1">
            <Link
              href={`/blog/${post.slug}`}
              className="group relative flex h-full gap-5 border-b py-6 outline-none transition-colors duration-300 hover:bg-muted/30 focus-visible:bg-muted/40 sm:gap-6 sm:py-8"
            >
              <span
                aria-hidden="true"
                className="text-4xl font-black leading-none text-transparent [-webkit-text-stroke:1px_var(--muted-foreground)] sm:text-5xl"
              >
                {String(index + 2).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {post.category} &middot;{" "}
                  <time dateTime={post.date}>{formatBlogDate(post.date)}</time>{" "}
                  &middot; {readingTime(post)}
                </p>
                <h3 className="mt-2 text-balance text-lg font-semibold leading-snug tracking-tight sm:text-xl">
                  {post.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {post.excerpt}
                </p>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="mt-1 size-5 shrink-0 -translate-x-2 text-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
              />
            </Link>
          </RevealItem>
        ))}
      </div>
    </RevealGroup>
  );
}
