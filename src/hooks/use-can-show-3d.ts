"use client";

import { useEffect, useState } from "react";

let webglSupportCache: boolean | null = null;

/**
 * Cheap, cached feature check: can this browser actually create a WebGL
 * context right now? A throwaway canvas is the standard way to ask --
 * `getContext` legitimately returns `null` on real devices (GPU driver
 * rejection, memory pressure, Low Power Mode, a context budget already
 * spent by other tabs) without throwing, so this has to be checked
 * before mounting a `Canvas`, not discovered by letting it fail.
 * Cached because the answer can't change within a page session and
 * creating canvases isn't free.
 */
function detectWebglSupport(): boolean {
  if (webglSupportCache !== null) return webglSupportCache;
  if (typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    webglSupportCache = !!gl;
  } catch {
    webglSupportCache = false;
  }

  return webglSupportCache;
}

/**
 * Whether the hero's 3D scene should render.
 *
 * Off by default, and during server rendering, so there is never a flash
 * or layout shift. Turns on once we've confirmed -- client-side -- both
 * that the user hasn't asked for reduced motion AND that this browser
 * can actually create a WebGL context. The reduced-motion gate is an
 * accessibility signal; the WebGL gate is a capability check -- without
 * it, a device that can't create a context still tried to mount the
 * `Canvas`, which throws in that case (see `CanvasErrorBoundary`).
 * Deliberately not gated on viewport width: mobile gets the 3D mark too
 * now (owner's explicit ask), just in its own compact grid cell above
 * the text rather than a full-bleed overlay -- see home-hero.tsx.
 */
export function useCanShow3D(): boolean {
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const webglSupported = detectWebglSupport();

    const evaluate = () => {
      setCanShow(webglSupported && !reducedMotion.matches);
    };

    evaluate();

    reducedMotion.addEventListener("change", evaluate);

    return () => {
      reducedMotion.removeEventListener("change", evaluate);
    };
  }, []);

  return canShow;
}
