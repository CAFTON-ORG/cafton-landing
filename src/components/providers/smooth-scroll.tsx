"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";

// Next's router resets the native scroll position on navigation, but Lenis
// virtualizes scroll on top of that -- left alone, it keeps rendering at its
// own last position (e.g. still showing the homepage's CTA band after
// navigating to /about), since nothing ever told ITS position to reset.
function ScrollResetOnNavigate() {
  const pathname = usePathname();
  const lenis = useLenis();

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [pathname, lenis]);

  return null;
}

interface SmoothScrollProps {
  children: ReactNode;
}

// Site-wide smooth scroll. Uses Lenis's "root" mode, which scrolls the
// real `window` (via window.scrollTo under the hood, not a transformed
// wrapper div) -- this is what keeps it compatible with the hero's
// `position: sticky` pinning. Skipped entirely for prefers-reduced-motion,
// same convention as Reveal: those users get plain native
// scroll rather than a disabled-but-still-mounted smoothing layer.
export function SmoothScroll({ children }: SmoothScrollProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root>
      <ScrollResetOnNavigate />
      {children}
    </ReactLenis>
  );
}
