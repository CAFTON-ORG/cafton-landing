import Image from "next/image";
import { CoverArt } from "@/components/shared/cover-art";
import type { CaftonEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

interface EventPosterProps {
  event: CaftonEvent;
  priority?: boolean;
  className?: string;
}

/**
 * The poster, set at a slight angle with reticle marks standing off its
 * corners (the same nod the nav and tiles use). It straightens on hover.
 */
export function EventPoster({ event, priority = false, className }: EventPosterProps) {
  const { poster } = event;

  return (
    <div className={cn("group relative mx-auto w-full max-w-sm lg:max-w-md", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute -left-3 -top-3 size-5 border-l-2 border-t-2 border-foreground/60" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-3 -top-3 size-5 border-r-2 border-t-2 border-foreground/60" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-3 -left-3 size-5 border-b-2 border-l-2 border-foreground/60" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-3 -right-3 size-5 border-b-2 border-r-2 border-foreground/60" />
      <div className="transition-transform duration-500 ease-out motion-safe:lg:rotate-2 motion-safe:lg:group-hover:rotate-0">
        {poster ? (
          <Image
            src={poster.src}
            alt={poster.alt}
            width={poster.width}
            height={poster.height}
            priority={priority}
            sizes="(min-width: 1024px) 28rem, (min-width: 640px) 24rem, 90vw"
            className="h-auto w-full rounded-lg shadow-2xl"
          />
        ) : (
          <div className="relative aspect-1400/1974 w-full overflow-hidden rounded-lg shadow-2xl">
            <CoverArt />
          </div>
        )}
      </div>
    </div>
  );
}
