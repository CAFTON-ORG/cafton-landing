"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Seconds between blocks that scroll into view together, and the most it adds. */
const STAGGER = 0.1;
const MAX_DELAY = 0.5;

/**
 * Drives the scroll reveals (`.reveal` blocks from components/motion/reveal).
 *
 * Content is always rendered visible by the server, so nothing waits on this
 * script to appear and the first paint (and LCP) are unaffected. Once the page
 * has hydrated, only the blocks still *below* the fold are hidden, and each is
 * faded up the first time it scrolls into view -- blocks that scroll in
 * together are staggered by their order on the page. One shared
 * IntersectionObserver, no animation library. Skipped entirely for
 * prefers-reduced-motion.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const fold = window.innerHeight * 0.92;
    const blocks = Array.from(document.querySelectorAll<HTMLElement>(".reveal")).filter(
      (el) => el.getBoundingClientRect().top > fold,
    );
    if (blocks.length === 0) return;

    const settle = (el: HTMLElement) => {
      el.classList.remove("is-hidden", "is-visible");
      el.style.transitionDelay = "";
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target as HTMLElement)
          .sort((a, b) =>
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
          );

        entering.forEach((el, index) => {
          el.style.transitionDelay = `${Math.min(index * STAGGER, MAX_DELAY)}s`;
          el.classList.add("is-visible");
          el.addEventListener("transitionend", () => settle(el), { once: true });
          observer.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -60px 0px" },
    );

    for (const el of blocks) {
      el.classList.add("is-hidden");
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
      for (const el of blocks) settle(el);
    };
  }, [pathname]);

  return null;
}
