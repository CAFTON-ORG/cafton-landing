import { Reveal } from "@/components/motion/reveal";
import { PhotoGallery } from "@/components/blog/photo-gallery";
import type { BlogPost } from "@/types/content";

/**
 * The article text in a reading-width column, with photos and galleries set
 * wider than the text between paragraphs: the text stays at a comfortable
 * line length while images get the room a grid needs.
 */
export function PostBody({ post }: { post: BlogPost }) {
  const media = post.media ?? [];

  return (
    <div className="mt-10 flex flex-col gap-6">
      {post.content.map((paragraph, index) => (
        <div key={index} className="contents">
          <Reveal className="mx-auto w-full max-w-2xl">
            <p className="text-base leading-7 text-foreground/90 sm:text-lg sm:leading-8">
              {paragraph}
            </p>
          </Reveal>
          {media
            .filter((item) => item.after === index)
            .map((item) => (
              <Reveal key={`${item.after}-${item.images[0]?.src}`} className="my-2 sm:my-4">
                <PhotoGallery images={item.images} caption={item.caption} />
              </Reveal>
            ))}
        </div>
      ))}
    </div>
  );
}
