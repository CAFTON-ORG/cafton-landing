import Image from "next/image";

/**
 * The team photo with reticle marks standing off its corners (the same nod
 * the nav, tiles and event poster use).
 */
export function TeamPhoto() {
  return (
    <div className="group relative h-full w-full">
      <span aria-hidden="true" className="pointer-events-none absolute -left-3 -top-3 z-10 size-6 border-l-2 border-t-2 border-foreground/60" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-3 -top-3 z-10 size-6 border-r-2 border-t-2 border-foreground/60" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-3 -left-3 z-10 size-6 border-b-2 border-l-2 border-foreground/60" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-3 -right-3 z-10 size-6 border-b-2 border-r-2 border-foreground/60" />
      <div className="relative h-full w-full overflow-hidden rounded-xl border bg-muted/40">
        <Image
          src="/cafton-team.jpg"
          alt="The Cafton team"
          fill
          sizes="(min-width: 1024px) 40vw, 100vw"
          priority
          className="object-cover grayscale transition-[filter] duration-500 group-hover:grayscale-0"
        />
      </div>
    </div>
  );
}
