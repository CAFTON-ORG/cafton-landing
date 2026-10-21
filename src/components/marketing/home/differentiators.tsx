"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { DotPattern } from "@/components/marketing/decor/dot-pattern";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/motion/reveal";
import { PageShell } from "@/components/marketing/layout/page-shell";
import { useCanShow3D } from "@/components/marketing/three/use-can-show-3d";
import { useNearViewport } from "@/hooks/use-near-viewport";
import { onHeroReady } from "@/components/marketing/motion/hero-ready";
import { CanvasErrorBoundary } from "@/components/marketing/three/canvas-error-boundary";
import { coreValues as values } from "@/config/values";
import { cn } from "@/lib/utils";

const DifferentiatorsMark = dynamic(
  () =>
    import("@/components/marketing/three/differentiators-mark").then(
      (mod) => mod.DifferentiatorsMark
    ),
  { ssr: false }
);

const NUMBER_SIZE = "text-[clamp(4.5rem,min(20vw,36vh),12rem)]";

const TITLE_SIZE = "text-[clamp(2rem,6vw,4.5rem)]";

// Keeps the title readable where it crosses the 3D mark. Not used on the
// outlined numeral: a glow on a thin stroke just dims it.
const HALO = "[text-shadow:0_0_24px_var(--background),0_0_8px_var(--background)]";

/** Fallback for reduced-motion / no-WebGL visitors: the same six values as the About page, as a plain list. */
function StaticDifferentiators() {
  return (
    <section id="why-cafton" className="relative border-t py-14 sm:py-16 lg:py-20">
      <PageShell className="relative grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-24">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Why Cafton
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            What guides our work.
          </h2>
          <p className="mt-5 max-w-sm text-muted-foreground">
            Six commitments we hold ourselves to, on every project and in
            every conversation.
          </p>
        </Reveal>

        <RevealGroup>
          <ol className="border-b">
            {values.map((value, index) => (
              <RevealItem as="li" key={value.title} className="border-t">
                <div className="grid gap-x-8 gap-y-2 py-7 sm:grid-cols-[5rem_1fr]">
                  <span
                    aria-hidden="true"
                    className="text-outline text-5xl font-black leading-none tabular-nums sm:text-6xl"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">{value.title}</h3>
                    <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
                      {value.description}
                    </p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </ol>
        </RevealGroup>
      </PageShell>
    </section>
  );
}

const HOLD_SEGMENTS = values.length + 1;

function ScrollDifferentiators() {
  const sectionRef = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const lastIndex = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  // Two screens early: the canvas needs a moment to start (context, shaders,
  // first frame), so it is ready, not just starting, when the section arrives.
  const [markRef, nearMark] = useNearViewport<HTMLDivElement>("200% 0px");
  // ...but not while the hero is still starting its own canvas: two WebGL
  // contexts initialising at once slows the one the visitor is waiting on.
  // Wait for the hero's first frame (or a few seconds, if the hero never
  // draws, e.g. the page was opened scrolled down).
  const [heroSettled, setHeroSettled] = useState(false);

  useEffect(() => {
    const unsubscribe = onHeroReady(() => setHeroSettled(true));
    const fallback = window.setTimeout(() => setHeroSettled(true), 4000);
    return () => {
      unsubscribe();
      window.clearTimeout(fallback);
    };
  }, []);

  // Progress 0 -> 1 from the section's top reaching the viewport top to its
  // bottom reaching it. Read from native scroll (Lenis scrolls the real
  // window, so these events fire for it too) on at most one frame at a time,
  // and only while the section is on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let frame = 0;
    // Measured once and again on resize, so a scroll frame is arithmetic only
    // (no layout read). Both are relative to the document, not the viewport.
    let sectionTop = 0;
    let sectionHeight = 1;

    const measure = () => {
      sectionTop = section.getBoundingClientRect().top + window.scrollY;
      sectionHeight = section.offsetHeight || 1;
    };

    const update = () => {
      frame = 0;
      const next = Math.min(1, Math.max(0, (window.scrollY - sectionTop) / sectionHeight));
      progress.current = next;
      const index = Math.min(values.length - 1, Math.floor(next * HOLD_SEGMENTS));
      if (index !== lastIndex.current) {
        lastIndex.current = index;
        setActiveIndex(index);
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onResize);
        onResize();
      } else {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
      }
    });
    observer.observe(section);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const active = values[activeIndex];
  const number = String(activeIndex + 1).padStart(2, "0");

  return (
    <section
      id="why-cafton"
      ref={sectionRef}
      className="relative"
      // One viewport of scrolling per value, so each gets its moment.
      style={{ height: `${values.length * 100}svh` }}
    >
      <h2 className="sr-only">What guides our work</h2>

      {/* svh so the pinned stage (and its canvas) keeps one size while a phone's toolbar collapses. */}
      <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden border-y">
        <div className="pointer-events-none absolute inset-0">
          <DotPattern className="opacity-60" size="md" fadeStyle="ellipse" />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--foreground)_10%,transparent)_0%,transparent_55%)]"
        />
        <div className="relative grid h-full grid-rows-[auto_1fr_auto] gap-6 px-5 pb-14 pt-8 md:block md:gap-0 md:p-0">
          <div className="pointer-events-none z-20 md:absolute md:inset-0 md:mx-auto md:max-w-7xl md:px-8">
            <p className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground md:absolute md:left-8 md:top-[2%] md:mb-0">
              <span aria-hidden="true" className="h-px w-8 bg-foreground/40" />
              Why Cafton
              <span className="tabular-nums text-foreground">
                {number} / {String(values.length).padStart(2, "0")}
              </span>
            </p>
            <div
              key={activeIndex}
              className="animate-in fade-in slide-in-from-bottom-6 duration-500 motion-reduce:animate-none md:absolute md:left-8 md:top-[9%] md:max-w-[85%]"
            >
              <span
                aria-hidden="true"
                className={`text-outline block font-black uppercase leading-none tabular-nums tracking-[0.01em] [--outline-width:4px] ${NUMBER_SIZE}`}
              >
                {number}
              </span>
              <h3
                className={`mt-3 flex items-center gap-3 font-black uppercase leading-[0.95] tracking-tight ${HALO} ${TITLE_SIZE}`}
              >
                <active.icon className="size-8 shrink-0 md:size-10" aria-hidden="true" />
                {active.title}
              </h3>
            </div>

            {/* The whole list, so the visitor always knows where they are in it. */}
            <ol className="hidden md:absolute md:bottom-[12%] md:left-8 md:flex md:flex-col md:gap-2.5">
              {values.map((value, index) => (
                <li
                  key={value.title}
                  className={cn(
                    "flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] transition-colors duration-300",
                    index === activeIndex ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-px transition-all duration-300",
                      index === activeIndex ? "w-10 bg-foreground" : "w-4 bg-foreground/30",
                    )}
                  />
                  {value.title}
                </li>
              ))}
            </ol>
          </div>

          <div ref={markRef} className="relative z-10 min-h-0 md:absolute md:inset-0">
            {nearMark && heroSettled && (
              <CanvasErrorBoundary fallback={null}>
                <DifferentiatorsMark progressRef={progress} />
              </CanvasErrorBoundary>
            )}
          </div>

          <div className="pointer-events-none relative z-30 md:absolute md:inset-0 md:mx-auto md:max-w-7xl md:px-8">
            <p
              key={activeIndex}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-backwards motion-reduce:animate-none pointer-events-auto text-base leading-relaxed text-foreground/80 [text-shadow:0_0_16px_var(--background),0_0_6px_var(--background)] md:absolute md:bottom-[12%] md:right-8 md:max-w-md md:text-right md:text-xl"
            >
              {active.description}
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex justify-center gap-2 md:hidden">
          {values.map((value, index) => (
            <span
              key={value.title}
              aria-hidden="true"
              className={`h-1 rounded-full transition-all duration-300 ${
                index === activeIndex ? "w-8 bg-foreground" : "w-4 bg-foreground/20"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function Differentiators() {
  const canShow3D = useCanShow3D();

  if (!canShow3D) {
    return <StaticDifferentiators />;
  }

  return <ScrollDifferentiators />;
}
