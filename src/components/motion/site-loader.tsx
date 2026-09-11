"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { LOGO_PATH_D, Logo } from "@/components/shared/logo";

/** Hard ceiling regardless of whether "load" ever fires -- see the effect below for why this has to be unreschedulable. */
const MAX_WAIT_MS = 1500;
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
 * Two independent, unconditional signals feed the same idempotent
 * `finish()` -- whichever fires first wins:
 * - `window.load` -- the browser's own confirmation that every resource
 *   queued at load time (images, fonts, scripts, stylesheets) has
 *   finished. Not tied to any one component's readiness.
 * - A flat `MAX_WAIT_MS` timeout, so a slow or partially-failed load can
 *   never hold the page hostage.
 *
 * `window.load` only fires once per real navigation, not on Next's
 * client-side route transitions -- so this naturally shows once per fresh
 * page load/refresh and never again while navigating around the site.
 */
export function SiteLoader() {
  const [visible, setVisible] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      setDismissing(true);
      window.setTimeout(() => setVisible(false), FADE_MS);
    };

    if (document.readyState === "complete") {
      finish();
      return;
    }

    window.addEventListener("load", finish, { once: true });
    const safety = window.setTimeout(finish, MAX_WAIT_MS);

    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(safety);
    };
  }, []);

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
