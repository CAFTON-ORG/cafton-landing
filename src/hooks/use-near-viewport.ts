"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Becomes `true` the first time the element comes within `rootMargin` of the
 * viewport, and stays `true`. For deferring heavy, below-the-fold work (a
 * WebGL canvas) until the visitor is about to reach it.
 */
export function useNearViewport<T extends HTMLElement>(
  rootMargin = "600px 0px",
): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [near, rootMargin]);

  return [ref, near];
}
