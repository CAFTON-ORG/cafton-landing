"use client";

import { useEffect, useState } from "react";

/**
 * Whether the hero's 3D scene should render.
 *
 * Off by default, and during server rendering, so there is never a flash
 * or layout shift. Turns on once we've confirmed -- client-side -- that
 * the user hasn't asked for reduced motion. Deliberately not gated on
 * viewport width: mobile gets the 3D mark too now (owner's explicit
 * ask), just in its own compact grid cell above the text rather than a
 * full-bleed overlay -- see home-hero.tsx. `prefers-reduced-motion` is
 * the one gate that stays, since it's an accessibility signal, not a
 * capability check.
 */
export function useCanShow3D(): boolean {
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const evaluate = () => {
      setCanShow(!reducedMotion.matches);
    };

    evaluate();

    reducedMotion.addEventListener("change", evaluate);

    return () => {
      reducedMotion.removeEventListener("change", evaluate);
    };
  }, []);

  return canShow;
}
