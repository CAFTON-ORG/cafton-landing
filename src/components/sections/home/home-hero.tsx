"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/shared/dot-pattern";
import { Magnetic } from "@/components/motion/magnetic";
import Link from "next/link";
import { useCanShow3D } from "@/hooks/use-can-show-3d";

gsap.registerPlugin(ScrollTrigger);

// Loaded client-side only, and only when useCanShow3D() is true -- keeps
// three.js/R3F out of the server-rendered HTML and out of the initial
// bundle entirely for prefers-reduced-motion visitors.
const HeroScene = dynamic(
  () => import("@/components/three/hero-scene").then((mod) => mod.HeroScene),
  { ssr: false },
);

// How much of the hero's scroll distance the text reveal takes -- kept
// in sync with hero-scene.tsx's REVEAL_END so the mark finishes
// resolving at the same point the CTA finishes fading in, then both
// hold steady for the rest of the scroll. 0.6 means the reveal is done
// by 60% through the pinned scroll, leaving a 40% hold to actually read
// the headline/subhead/CTA before the section releases -- the previous
// timeline only finished at 95%, leaving almost no hold time, which is
// what the owner reported ("next section shows up" before they could
// finish reading).
const REVEAL_END = 0.6;

export function HomeHero() {
  const canShow3D = useCanShow3D();

  const headlineLine1Ref = useRef<HTMLSpanElement>(null);
  const headlineLine2Ref = useRef<HTMLSpanElement>(null);
  const subheadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Text choreography, per Experience-Map.md: line 1 arrives on load; line
  // 2, the subhead, and the CTAs reveal progressively as the user scrolls
  // through the hero, in step with the mark resolving (hero-scene.tsx
  // reads the same underlying scroll position, via its own ScrollTrigger).
  // Only runs when canShow3D is true -- otherwise the hero stays exactly
  // as it always has: fully visible, no animation, nothing extra loaded.
  //
  // #hero is deliberately much taller than one viewport (see the JSX
  // below): the visible content sticks in place while that extra height
  // scrolls past, which is what gives the resolve animation room to
  // actually play out instead of being over in a single scroll tick --
  // and, since REVEAL_END < 1, room for a genuine hold afterward too.
  useLayoutEffect(() => {
    if (!canShow3D) return;

    const line1 = headlineLine1Ref.current;
    const line2 = headlineLine2Ref.current;
    const subhead = subheadRef.current;
    const cta = ctaRef.current;
    if (!line1 || !line2 || !subhead || !cta) return;

    const ctx = gsap.context(() => {
      // Line 1: a one-time entrance on load, not tied to scroll.
      gsap.fromTo(
        line1,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
      );

      // Line 2, subhead, and CTAs: revealed progressively as the user
      // scrolls through the hero, all finishing by REVEAL_END so the
      // remainder of the scroll is a stable, readable hold. scrub: 1
      // adds a light, smoothed lag behind the actual scroll position
      // rather than tracking it 1:1 -- reads as more deliberate, less
      // mechanical.
      gsap.set([line2, subhead, cta], { opacity: 0, y: 24 });

      // IMPORTANT: this ScrollTrigger's own `end` is capped at REVEAL_END
      // of the hero's scrollable distance -- not "bottom top" (the whole
      // hero), unlike the mark's ScrollTrigger in hero-scene.tsx. That
      // earlier version used "bottom top" here too and only *scaled the
      // tween positions* by REVEAL_END, which turned out to be a no-op:
      // GSAP's scrub maps scroll progress 0-1 linearly onto the
      // timeline's own playhead (0 -> its total duration), so scaling
      // every position by the same constant also scales the total
      // duration by that constant, and the ratio between them -- which is
      // what actually determines how much of the scroll range the reveal
      // consumes -- doesn't change. The CTA kept finishing right at the
      // very end regardless. Capping this trigger's own `end` is what
      // actually bounds the reveal to the first REVEAL_END of the scroll:
      // once scroll passes that point, this (separate) ScrollTrigger is
      // past its own end and the scrubbed tween just holds at its
      // completed state for the remaining scroll distance.
      gsap
        .timeline({
          scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: () => {
              const heroEl = document.getElementById("hero");
              const scrollable =
                (heroEl?.offsetHeight ?? window.innerHeight) -
                window.innerHeight;
              return `+=${Math.max(scrollable, 0) * REVEAL_END}`;
            },
            scrub: 1,
            invalidateOnRefresh: true,
          },
        })
        .to(line2, { opacity: 1, y: 0, duration: 0.2 }, 0.15)
        .to(subhead, { opacity: 1, y: 0, duration: 0.2 }, 0.45)
        .to(cta, { opacity: 1, y: 0, duration: 0.2 }, 0.75);
    });

    return () => ctx.revert();
  }, [canShow3D]);

  return (
    // 200vh on mobile, 320vh from md up: on mobile the reveal itself is
    // simpler (single column, no split layout) so it doesn't need as
    // much runway; on desktop the extra height is what buys the longer
    // hold period described above. Actual pin distance is measured live
    // by ScrollTrigger off the rendered element, so this is purely CSS.
    <section id="hero" className="relative h-[200vh] md:h-[320vh]">
      {/* The pinned "stage": stays fixed just below the sticky navbar
          (top-16 = the navbar's own height) for the whole scroll run
          above, then releases naturally into the next section once
          #hero's extra height runs out. Everything visible lives in here,
          not in the outer section -- that element exists purely to give
          the scroll-driven animation room to play out.

          Grid, not a centered stack: on mobile the 3D mark gets a fixed
          45% band up top and text fills the rest below it; from md up it
          switches to a genuine two-column split (text / mark), with
          `order` swapping which side the mark renders on for each
          breakpoint. This is the direct fix for "the 3D blocks the
          text" -- the mark now lives in its own grid cell and can never
          visually overlap the copy, instead of both being centered on
          top of each other. */}
      <div className="sticky top-16 grid h-[calc(100vh-4rem)] grid-rows-[45%_auto] items-center overflow-hidden bg-linear-to-b from-background to-background/80 md:grid-cols-2 md:grid-rows-1">
        {/* Background dot pattern -- spans the whole stage. */}
        <div className="absolute inset-0">
          <DotPattern className="opacity-100" size="md" fadeStyle="ellipse" />
        </div>

        {/* Vignette: darkens toward the edges so the center of the stage
            (where the mark + headline live) reads as the clear focal
            point -- part of the "cinematic, not plain dots" pass. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_75%_65%_at_50%_50%,transparent_45%,var(--background)_100%)]"
        />

        {/* Static film-grain texture. Deliberately a plain CSS background
            (an inline SVG turbulence data-URI), not an animated/JS-driven
            layer -- design-taste-frontend's own rule is grain belongs on
            a fixed, non-repainting layer specifically to protect mobile
            frame rate; a static background-image inside this
            already-pinned (not scrolling) stage costs one paint, the
            same as that rule intends. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]"
        />

        {/* 3D resolving mark -- see Experience-Map.md for the design
            intent. Off only for prefers-reduced-motion: the hero then
            looks exactly as it always has, with nothing extra loaded and
            no text animation either. */}
        <div className="relative order-1 h-full w-full md:order-2">
          {/* Soft ambient glow behind the mark -- grayscale, low
              opacity, matching the monochrome theme (no neon/purple
              glow per design-taste-frontend's own rule against that). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_45%,color-mix(in_oklch,var(--foreground)_16%,transparent)_0%,transparent_65%)]"
          />
          {canShow3D && <HeroScene />}
        </div>

        <div className="order-2 px-4 sm:px-6 lg:px-8 md:order-1 md:px-0">
          <div className="mx-auto max-w-xl text-center md:mx-0 md:ml-auto md:pl-6 md:text-left lg:pl-12">
            {/* Main Headline */}
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span ref={headlineLine1Ref}>
                We don&apos;t start with software.
              </span>
              <span
                ref={headlineLine2Ref}
                className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent"
              >
                {" "}
                We start with the problem.{" "}
              </span>
            </h1>

            {/* Subheading */}
            <p
              ref={subheadRef}
              className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl md:mx-0"
            >
              Cafton engineers custom software, web and mobile applications, and
              SaaS products around the way organizations actually work.
            </p>

            {/* CTA Buttons */}
            <div
              ref={ctaRef}
              className="flex flex-row flex-wrap justify-center gap-4 md:justify-start"
            >
              <Button className="cursor-pointer group" asChild>
                <Link href="/contact">
                  Start a Project
                  <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button
                variant="outline"
                className="cursor-pointer group"
                asChild
              >
                <Link href="/portfolio">
                  Explore Our Work
                  <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
