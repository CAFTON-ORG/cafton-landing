"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { LOGO_PATH_D, Logo } from "@/components/shared/logo";
import { canShow3DNow } from "@/hooks/use-can-show-3d";
import { onHeroReady } from "@/lib/hero-ready";

/** Hard ceiling regardless of whether "load" ever fires -- see the effect below for why this has to be unreschedulable. */
const MAX_WAIT_MS = 1500;
/** Same ceiling on the homepage, where the loader also waits for the hero's 3D mark. Longer, because the three.js chunk has to download and the WebGL context start. */
const HERO_MAX_WAIT_MS = 4000;
/** How long the fade-out transition runs before the loader unmounts entirely. */
const FADE_MS = 400;

/**
 * First-paint loading screen, site-wide. A prior version of this exact
 * feature (deleted -- see project history) broke twice from over-coupling
 * its dismiss timing to *other* systems' own async lifecycles (a specific
 * WebGL canvas's `onCreated` callback, Lenis's own init, a `useEffect`
 * whose dependency array included values that resolved a tick after mount
 * and kept re-scheduling every timer, including the "hard" safety bound,
 * from that later point instead of the original one). This version
 * deliberately avoids all of that: the effect below has an empty
 * dependency array, so it runs exactly once, schedules its timers exactly
 * once, and nothing can ever re-arm or push them later.
 *
 * The same idempotent `finish()` is fed by:
 * - `window.load` -- the browser's own confirmation that every resource
 *   queued at load time (images, fonts, scripts, stylesheets) has
 *   finished.
 * - On the homepage only, when this device will actually render the 3D
 *   mark: the hero scene's first presented frame (`onHeroReady`). Without
 *   it the loader lifted as soon as the page loaded, revealing an empty
 *   hero while the heavy 3D chunk was still arriving. This is a plain
 *   one-way event, not a dependency on the canvas's own lifecycle, and
 *   it is the only thing the dismissal waits on besides `load`.
 * - A flat timeout, armed exactly once, so a slow or failed load (or a
 *   hero that never draws) can never hold the page hostage.
 *
 * `window.load` only fires once per real navigation, so a fresh page load
 * or refresh always shows the loader. Client-side navigation does not -- with
 * one exception: arriving at the homepage re-runs the effect (keyed on the
 * pathname only, so it still arms its timers exactly once per navigation) and
 * brings the loader back until the hero's 3D mark has drawn, because the scene
 * has to be rebuilt from scratch every time the homepage mounts. Any other
 * client-side route just dismisses a loader that might still be showing.
 */
export function SiteLoader() {
  const [visible, setVisible] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  // A layout effect, so on a client-side arrival at "/" the loader is back on
  // screen before the browser paints the new page, not a frame after it.
  useLayoutEffect(() => {
    const navigated = lastPath.current !== null && lastPath.current !== pathname;
    lastPath.current = pathname;

    const waitForHero = pathname === "/" && canShow3DNow();

    if (navigated && !waitForHero) {
      setVisible(false);
      return;
    }
    if (navigated) {
      setDismissing(false);
      setVisible(true);
    }

    let settled = false;
    let hideTimer: number | undefined;

    const finish = () => {
      if (settled) return;
      settled = true;
      setDismissing(true);
      hideTimer = window.setTimeout(() => setVisible(false), FADE_MS);
    };

    let loaded = navigated || document.readyState === "complete";
    let heroReady = !waitForHero;

    const check = () => {
      if (loaded && heroReady) finish();
    };
    const handleLoad = () => {
      loaded = true;
      check();
    };
    const handleHeroReady = () => {
      heroReady = true;
      check();
    };

    if (!loaded) window.addEventListener("load", handleLoad, { once: true });
    const unsubscribeHero = waitForHero ? onHeroReady(handleHeroReady) : () => {};
    const safety = window.setTimeout(finish, waitForHero ? HERO_MAX_WAIT_MS : MAX_WAIT_MS);
    check();

    return () => {
      window.removeEventListener("load", handleLoad);
      unsubscribeHero();
      window.clearTimeout(safety);
      window.clearTimeout(hideTimer);
    };
  }, [pathname]);

  if (!visible) return null;

  // Reduced-motion visitors get the plain, static, already-resolved mark --
  // no draw-in, no glow, no rings -- matching this project's standing
  // reduced-motion convention everywhere else (show the end state, not a
  // disabled-but-still-mounted animation).
  if (reduceMotion) {
    return (
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-100 flex items-center justify-center bg-background transition-opacity duration-400 ${
          dismissing ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <Logo size={88} className="text-foreground" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-100 flex items-center justify-center bg-background transition-opacity duration-400 ${
        dismissing ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex size-32 items-center justify-center">
        {/* Two rings pulsing outward behind the mark, staggered for a layered "sonar" read. */}
        <span className="animate-loader-ring absolute size-20 rounded-full border border-foreground/40" />
        <span className="animate-loader-ring absolute size-20 rounded-full border border-foreground/40 [animation-delay:1.2s]" />

        <svg
          viewBox="0 0 36 42"
          className="relative size-22"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outline draws itself in first -- pathLength="1" normalizes the
              dash math to a 0-1 range regardless of the path's real length,
              so no JS measurement of the path is needed. */}
          <path
            d={LOGO_PATH_D}
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeDasharray={1}
            strokeDashoffset={1}
            className="animate-loader-draw text-foreground/70"
          />
          {/* Filled mark fades in once the outline finishes, then holds a slow glow pulse. */}
          <path d={LOGO_PATH_D} fill="currentColor" className="animate-loader-fill-in text-foreground opacity-0" />
        </svg>
      </div>
    </div>
  );
}
