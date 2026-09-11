"use client";

import { useState } from "react";
import Image from "next/image";
import type { BlogPost } from "@/lib/blog";
import { ImageSkeleton } from "@/components/shared/image-skeleton";

export function BlogHeroImage({ post }: { post: BlogPost }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative mx-auto aspect-video max-w-2xl overflow-hidden rounded-xl border">
      {!loaded && <ImageSkeleton />}
      <Image
        src={post.imageLight}
        alt={post.imageAlt}
        fill
        sizes="(min-width: 640px) 42rem, 100vw"
        priority
        onLoad={() => setLoaded(true)}
        className={`object-cover object-top transition-opacity duration-500 dark:hidden ${loaded ? "opacity-100" : "opacity-0"}`}
      />
      <Image
        src={post.imageDark}
        alt={post.imageAlt}
        fill
        sizes="(min-width: 640px) 42rem, 100vw"
        priority
        onLoad={() => setLoaded(true)}
        className={`hidden object-cover object-top transition-opacity duration-500 dark:block ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
