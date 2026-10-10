"use client";

import { useState } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlogImage } from "@/types/content";

/** Tiles shown before the rest collapse into a "+N" tile. */
const MAX_TILES = 5;

/**
 * Where each tile sits, by how many photos there are. One photo keeps its own
 * proportions; two to four fill an even grid (three: a wide lead above two); five or more become a mosaic
 * with one lead photo, so a long set never grows into a long column.
 */
const LAYOUTS: Record<number, { grid: string; tiles: string[] }> = {
  2: { grid: "grid-cols-2 aspect-[8/3]", tiles: ["", ""] },
  3: {
    grid: "grid-cols-2",
    tiles: ["col-span-2 aspect-[2/1]", "aspect-[16/10]", "aspect-[16/10]"],
  },
  4: { grid: "grid-cols-2 grid-rows-2 aspect-[4/3]", tiles: ["", "", "", ""] },
  5: {
    grid: "grid-cols-4 grid-rows-2 aspect-[2/1]",
    tiles: ["col-span-2 row-span-2", "", "", "", ""],
  },
};

interface PhotoGalleryProps {
  images: BlogImage[];
  caption?: string;
}

/** Photos in an article: one figure or a grid, each opening a keyboard-friendly lightbox. */
export function PhotoGallery({ images, caption }: PhotoGalleryProps) {
  const [active, setActive] = useState<number | null>(null);
  if (images.length === 0) return null;

  const open = (index: number) => setActive(index);
  const shown = Math.min(images.length, MAX_TILES);
  const hidden = images.length - shown;
  const layout = LAYOUTS[shown];
  const figureCaption = caption ?? (images.length === 1 ? images[0].caption : undefined);

  return (
    <figure className="mx-auto w-full max-w-4xl">
      {layout ? (
        <div className={cn("grid gap-2 sm:gap-3", layout.grid)}>
          {images.slice(0, shown).map((image, index) => (
            <button
              key={`${image.src}-${index}`}
              type="button"
              onClick={() => open(index)}
              aria-label={`View photo ${index + 1} of ${images.length}: ${image.alt}`}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-lg border bg-muted/40 outline-none focus-visible:ring-[3px] focus-visible:ring-ring sm:rounded-xl",
                layout.tiles[index],
              )}
            >
              <Image
                src={image.src}
                alt=""
                fill
                sizes={index === 0 && shown === 5 ? "(min-width: 896px) 448px, 50vw" : "(min-width: 896px) 440px, 50vw"}
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
              />
              {hidden > 0 && index === shown - 1 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-bold text-white">
                  +{hidden + 1}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => open(0)}
          aria-label={`View photo: ${images[0].alt}`}
          className="group relative block w-full cursor-pointer overflow-hidden rounded-xl border bg-muted/40 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <Image
            src={images[0].src}
            alt=""
            width={images[0].width}
            height={images[0].height}
            sizes="(min-width: 896px) 896px, 100vw"
            className="h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
          />
        </button>
      )}

      {figureCaption && (
        <figcaption className="mt-3 text-center text-sm text-muted-foreground">
          {figureCaption}
        </figcaption>
      )}

      <Lightbox images={images} active={active} onActiveChange={setActive} />
    </figure>
  );
}

function Lightbox({
  images,
  active,
  onActiveChange,
}: {
  images: BlogImage[];
  active: number | null;
  onActiveChange: (index: number | null) => void;
}) {
  const total = images.length;
  const current = active === null ? null : images[active];
  const step = (delta: number) =>
    onActiveChange(active === null ? null : (active + delta + total) % total);

  return (
    <Dialog.Root open={active !== null} onOpenChange={(next) => !next && onActiveChange(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-70 bg-black/95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <Dialog.Content
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") step(1);
            if (event.key === "ArrowLeft") step(-1);
          }}
          className="fixed inset-0 z-70 flex flex-col text-white outline-none"
        >
          <Dialog.Title className="sr-only">Photo gallery</Dialog.Title>
          <Dialog.Description className="sr-only">
            Use the left and right arrow keys to move between photos, and Escape to close.
          </Dialog.Description>

          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <p className="text-sm tabular-nums text-white/80" aria-live="polite">
              {active !== null ? active + 1 : 0} / {total}
            </p>
            <Dialog.Close
              aria-label="Close gallery"
              className="flex size-11 cursor-pointer items-center justify-center rounded-full outline-none transition-colors hover:bg-white/15 focus-visible:ring-[3px] focus-visible:ring-white/60"
            >
              <X className="size-6" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="relative min-h-0 flex-1">
            {current && (
              <Image
                key={current.src}
                src={current.src}
                alt={current.alt}
                fill
                sizes="100vw"
                className="object-contain px-2 sm:px-16"
              />
            )}
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 outline-none transition-colors hover:bg-white/20 focus-visible:ring-[3px] focus-visible:ring-white/60 sm:left-4"
                >
                  <ChevronLeft className="size-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 outline-none transition-colors hover:bg-white/20 focus-visible:ring-[3px] focus-visible:ring-white/60 sm:right-4"
                >
                  <ChevronRight className="size-6" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          <p className="min-h-16 px-6 py-4 text-center text-sm text-white/80">
            {current?.caption ?? current?.alt}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
