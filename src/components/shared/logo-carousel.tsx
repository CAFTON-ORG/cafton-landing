"use client";

import Image from "next/image";
import { useReducedMotion } from "motion/react";

interface LogoCarouselItem {
  src: string;
  alt: string;
}

interface LogoCarouselProps {
  /** Real logos, once they exist. Falls back to `count` copies of a generic placeholder. */
  logos?: LogoCarouselItem[];
  count?: number;
}

const PLACEHOLDER_LOGO = "/partners/image copy.png";

/**
 * Infinite auto-scrolling logo strip (a "trusted by" marquee) with fade
 * edges. The visible track is the logo list rendered twice back to back;
 * the CSS animation (`globals.css`) translates it by exactly -50%, which
 * always lines up with the duplicate set regardless of how many logos
 * there are -- add real ones later by passing `logos`, no animation math
 * to redo. Reduced-motion visitors get the single set as a static
 * wrapping row instead of a scrolling track.
 */
export function LogoCarousel({ logos, count = 6 }: LogoCarouselProps) {
  const reduceMotion = useReducedMotion();
  const items: LogoCarouselItem[] =
    logos ??
    Array.from({ length: count }, (_, index) => ({
      src: PLACEHOLDER_LOGO,
      alt: `Partner logo placeholder ${index + 1}`,
    }));
  const track = reduceMotion ? items : [...items, ...items];

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-linear-to-r from-background to-transparent sm:w-24"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l from-background to-transparent sm:w-24"
      />
      <div
        className={
          reduceMotion
            ? "flex flex-wrap items-center justify-center gap-8 sm:gap-12"
            : "flex w-max items-center gap-8 animate-logo-scroll sm:gap-12"
        }
      >
        {track.map((logo, index) => (
          <div
            key={index}
            className="flex h-12 w-32 shrink-0 items-center justify-center opacity-60 grayscale transition-opacity duration-300 hover:opacity-100 sm:h-14 sm:w-40"
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={160}
              height={56}
              className="h-full w-auto object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
