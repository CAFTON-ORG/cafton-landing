"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

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

// Keeps GSAP's ticker and Lenis's virtual scroll in lockstep: Lenis drives
// the raf loop (autoRaf disabled below), GSAP's ticker drives Lenis, and
// ScrollTrigger re-reads scroll position on Lenis's own "scroll" event
// rather than the native scroll event it virtualizes over. Without this,
// ScrollTrigger-driven animations (the hero, in particular) lag a frame
// behind the smoothed scroll position.
function LenisGsapBridge() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    const update = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    lenis.on("scroll", ScrollTrigger.update);

    return () => {
      gsap.ticker.remove(update);
      lenis.off("scroll", ScrollTrigger.update);
    };
  }, [lenis]);

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
    <ReactLenis root options={{ autoRaf: false }}>
      <LenisGsapBridge />
      <ScrollResetOnNavigate />
      {children}
    </ReactLenis>
  );
}
