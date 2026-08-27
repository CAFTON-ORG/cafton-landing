"use client";

import { useEffect, useState } from "react";

/**
 * Whether the hero's 3D scene should render.
 *
 * Off by default, and during server rendering, so there is never a flash
 * or layout shift. Turns on only once we've confirmed -- client-side --
 * that the viewport is wide enough and the user hasn't asked for reduced
 * motion. On mobile, small viewports, or `prefers-reduced-motion`, the
 * hero simply stays exactly as it is today, with no 3D canvas mounted.
 */
export function useCanShow3D(): boolean {
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wideEnough = window.matchMedia("(min-width: 768px)");

    const evaluate = () => {
      setCanShow(!reducedMotion.matches && wideEnough.matches);
    };

    evaluate();

    reducedMotion.addEventListener("change", evaluate);
    wideEnough.addEventListener("change", evaluate);

    return () => {
      reducedMotion.removeEventListener("change", evaluate);
      wideEnough.removeEventListener("change", evaluate);
    };
  }, []);

  return canShow;
}
