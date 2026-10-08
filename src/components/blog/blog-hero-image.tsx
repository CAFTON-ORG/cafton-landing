import type { BlogPost } from "@/lib/blog";
import { CoverArt } from "@/components/shared/cover-art";
import { ThemedImage } from "@/components/shared/themed-image";

export function BlogHeroImage({ post }: { post: BlogPost }) {
  return (
    <div className="relative mx-auto aspect-video max-w-2xl overflow-hidden rounded-xl border bg-muted/40">
      {post.imageLight && post.imageDark ? (
        <ThemedImage
          light={post.imageLight}
          dark={post.imageDark}
          alt={post.imageAlt ?? ""}
          fill
          sizes="(min-width: 640px) 42rem, 100vw"
          priority
          className="object-cover object-top"
        />
      ) : (
        <CoverArt />
      )}
    </div>
  );
}
