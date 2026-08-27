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
// bundle entirely on mobile / reduced-motion.
const HeroScene = dynamic(
  () => import("@/components/three/hero-scene").then((mod) => mod.HeroScene),
  { ssr: false }
);

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
  // actually play out instead of being over in a single scroll tick.
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
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );

      // Line 2, subhead, and CTAs: revealed progressively as the user
      // scrolls through the hero. scrub: 1 adds a light, smoothed lag
      // behind the actual scroll position rather than tracking it 1:1 --
      // reads as more deliberate, less mechanical.
      gsap.set([line2, subhead, cta], { opacity: 0, y: 24 });

      gsap
        .timeline({
          scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        })
        .to(line2, { opacity: 1, y: 0, duration: 0.2 }, 0.15)
        .to(subhead, { opacity: 1, y: 0, duration: 0.2 }, 0.45)
        .to(cta, { opacity: 1, y: 0, duration: 0.2 }, 0.75);
    });

    return () => ctx.revert();
  }, [canShow3D]);

  return (
    <section id="hero" className="relative h-[280vh]">
      {/* The pinned "stage": stays fixed just below the sticky navbar
          (top-16 = the navbar's own height) for the whole 280vh scroll
          run above, then releases naturally into the next section once
          #hero's extra height runs out. Everything visible lives in here,
          not in the outer 280vh element -- that element exists purely to
          give the scroll-driven animation room to play out. */}
      <div className="sticky top-16 flex h-[calc(100vh-4rem)] items-center overflow-hidden bg-linear-to-b from-background to-background/80">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <DotPattern className="opacity-100" size="md" fadeStyle="ellipse" />
        </div>

        {/* 3D resolving mark -- see Experience-Map.md for the design
            intent. Off on mobile, low-end viewports, and
            prefers-reduced-motion: the hero then looks exactly as it
            always has, with nothing extra loaded and no text animation
            either. */}
        {canShow3D && <HeroScene />}

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="mx-auto max-w-4xl text-center">
            {/* Main Headline */}
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span ref={headlineLine1Ref}>We don&apos;t start with software.</span>
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
              className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl"
            >
              Cafton engineers custom software, web and mobile applications, and
              SaaS products around the way organizations actually work.
            </p>

            {/* CTA Buttons */}
            <div ref={ctaRef} className="flex flex-row gap-4 justify-center">
              <Magnetic>
                <Button className="cursor-pointer group" asChild>
                  <Link href="/contact">
                    Start a Project
                    <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </Magnetic>
              <Magnetic>
                <Button variant="outline" className="cursor-pointer group" asChild>
                  <Link href="/portfolio">
                    Explore Our Work
                    <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
