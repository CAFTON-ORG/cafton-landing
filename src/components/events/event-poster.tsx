import Image from "next/image";
import { Logo } from "@/components/shared/logo";
import { getEventStatus, type CaftonEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

const POSTER_ASPECT = "aspect-1400/1974";

/**
 * A poster composed in code for events that have no artwork: the Cafton mark,
 * the title, and a mosaic of the event's own photos. It is a fixed dark piece,
 * like the printed posters, so it does not follow the site theme.
 */
function ComposedPoster({ event }: { event: CaftonEvent }) {
  const photos = event.prizes.filter((prize) => prize.image).slice(0, 3);
  const closed = getEventStatus(event) === "closed";

  return (
    <div
      className={cn(
        "@container relative w-full overflow-hidden rounded-lg bg-[#0f0f0f] text-white shadow-2xl",
        POSTER_ASPECT,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:16px_16px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1)_0%,transparent_60%)]"
      />

      <div className="absolute inset-0 flex flex-col p-[7cqw]">
      <div className="relative flex items-center justify-center gap-[2cqw]">
        <Logo size={64} className="h-[7cqw] w-auto text-white" aria-hidden="true" />
        <span className="text-[5.5cqw] font-black tracking-tight">CAFTON</span>
      </div>

      <div className="relative mt-[6cqw] text-center">
        <p className="text-[3cqw] font-semibold uppercase tracking-[0.3em] text-white/60">
          Sponsor and voting partner
        </p>
        <h3 className="mt-[2cqw] text-balance text-[8.5cqw] font-black uppercase leading-[0.95] tracking-tight">
          {event.title}
        </h3>
      </div>

      <div className="relative mt-[6cqw] grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-[2.5cqw]">
        {photos.map((photo, index) => (
          <div
            key={photo.name}
            className={cn(
              "relative overflow-hidden rounded-[2cqw] border border-white/15 bg-black",
              index === 0 && "col-span-2",
            )}
          >
            <Image
              src={photo.image!}
              alt=""
              fill
              sizes="(min-width: 1024px) 28rem, 90vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="relative mt-[5cqw] flex items-center justify-between whitespace-nowrap text-[2.6cqw] font-semibold uppercase tracking-[0.15em]">
        <span className="text-white/60">www.cafton.com</span>
        {closed && (
          <span className="rounded-full border border-white/30 px-[3cqw] py-[1cqw]">
            Winners announced
          </span>
        )}
      </div>
      </div>
    </div>
  );
}

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
          <ComposedPoster event={event} />
        )}
      </div>
    </div>
  );
}
