"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

let instance: Lenis | null = null;

/** Smooth-scroll to the top, falling back to the browser's own scroll before Lenis has started. */
export function scrollToTop() {
  if (instance) instance.scrollTo(0);
  else window.scrollTo({ top: 0, behavior: "smooth" });
}

const INTENT_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

// Site-wide smooth scroll. Lenis runs in "root" mode, which scrolls the real
// `window` (not a transformed wrapper), keeping it compatible with the
// sticky pinning in the home page. Nothing about it is needed until the
// visitor actually scrolls, so it is only downloaded and started on their
// first interaction: it never competes with first paint or hydration, and it
// renders nothing, so it doesn't turn the whole layout into a client
// subtree. Skipped for prefers-reduced-motion: those visitors get plain
// native scrolling rather than a disabled-but-mounted smoothing layer.
export function SmoothScroll() {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();

  useEffect(() => {
    if (reduceMotion) return;

    let cancelled = false;

    const stopListening = () => {
      for (const type of INTENT_EVENTS) window.removeEventListener(type, start);
    };

    async function start() {
      stopListening();
      const { default: LenisCtor } = await import("lenis");
      if (cancelled) return;
      instance = new LenisCtor({ autoRaf: true });
    }

    for (const type of INTENT_EVENTS) {
      window.addEventListener(type, start, { passive: true, once: true });
    }

    return () => {
      cancelled = true;
      stopListening();
      instance?.destroy();
      instance = null;
    };
  }, [reduceMotion]);

  // Next resets the native scroll position on navigation, but Lenis keeps its
  // own virtual position and would otherwise keep rendering the old one.
  useEffect(() => {
    instance?.scrollTo(0, { immediate: true });
  }, [pathname]);

  return null;
}
