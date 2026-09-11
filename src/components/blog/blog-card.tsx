"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog";
import { formatBlogDate, readingTime } from "@/lib/blog";
import { ImageSkeleton } from "@/components/shared/image-skeleton";

export function BlogCard({ post }: { post: BlogPost }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors duration-300 hover:bg-muted/35"
    >
      <div className="relative aspect-video overflow-hidden">
        {!loaded && <ImageSkeleton />}
        <Image
          src={post.imageLight}
          alt={post.imageAlt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          onLoad={() => setLoaded(true)}
          className={`object-cover object-top grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0 dark:hidden ${loaded ? "opacity-100" : "opacity-0"}`}
        />
        <Image
          src={post.imageDark}
          alt={post.imageAlt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          onLoad={() => setLoaded(true)}
          className={`hidden object-cover object-top grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0 dark:block ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
          <span aria-hidden="true">&middot;</span>
          <span>{readingTime(post)}</span>
        </div>
        <h3 className="mt-2 text-base font-semibold leading-tight tracking-[-0.02em] sm:text-lg">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground sm:text-sm">
          {post.excerpt}
        </p>
        <span className="mt-auto inline-flex items-center pt-4 text-xs font-medium text-foreground sm:text-sm">
          Read more
          <ArrowRight className="ms-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
