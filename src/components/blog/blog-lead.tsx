import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthorAvatar } from "@/components/shared/author-avatar";
import { CoverArt } from "@/components/shared/cover-art";
import { ThemedImage } from "@/components/shared/themed-image";
import { formatBlogDate, readingTime } from "@/lib/blog";
import type { Author, BlogPost } from "@/types/content";

/** The newest article, set large above the archive on the first page of the unfiltered list. */
export function BlogLead({ post, author }: { post: BlogPost; author?: Author }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group grid items-center gap-6 outline-none lg:grid-cols-[1.3fr_1fr] lg:gap-12"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted/40 group-focus-visible:ring-[3px] group-focus-visible:ring-ring">
        {post.imageLight && post.imageDark ? (
          <ThemedImage
            light={post.imageLight}
            dark={post.imageDark}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <CoverArt />
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Latest &middot; {post.category}
        </p>
        <h2 className="mt-3 text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {post.title}
        </h2>
        <p className="mt-4 line-clamp-3 text-muted-foreground">{post.excerpt}</p>
        <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {author && <AuthorAvatar author={author} className="size-6" />}
          {author && <span className="font-medium text-foreground">{author.name}</span>}
          {author && <span aria-hidden="true">&middot;</span>}
          <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
          <span aria-hidden="true">&middot;</span>
          <span>{readingTime(post)}</span>
        </p>
        <span className="mt-6 inline-flex items-center text-sm font-medium">
          Read the article
          <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
