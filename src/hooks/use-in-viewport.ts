"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Whether the given element is within `rootMargin` of the viewport.
 *
 * Used to tear down the hero's WebGL canvas once it's scrolled well out
 * of view -- a canvas left mounted (and rendering every frame) for the
 * rest of a long page session is GPU/driver pressure with no payoff,
 * since nothing is visibly changing off-screen. That pressure is a
 * likely contributor to the WebGL context loss reported in production
 * (the canvas going blank after the page has been open a while).
 *
 * Starts `true` so the 3D scene still renders on first paint, before
 * the observer has had a chance to run.
 */
export function useInViewport<T extends HTMLElement>(
  rootMargin = "400px 0px",
): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inViewport, setInViewport] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(entry.isIntersecting),
      { rootMargin },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return [ref, inViewport];
}
