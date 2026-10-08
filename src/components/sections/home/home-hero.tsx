"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowRight, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/shared/dot-pattern";
import { useCanShow3D } from "@/hooks/use-can-show-3d";
import { cn } from "@/lib/utils";
import { CanvasErrorBoundary } from "@/components/three/canvas-error-boundary";
import { useInViewport } from "@/hooks/use-in-viewport";
import { ServiceSelectOverlay } from "@/components/sections/home/service-select-overlay";

// The scene pulls in three.js + react-three-fiber, the heaviest chunk on the
// page. `dynamic` alone only starts fetching it once the component first
// renders, which is after hydration AND the WebGL capability check -- so the
// download used to begin late. Kicking the same import off at module load
// starts it in parallel with hydration (the module cache dedupes the two).
const loadHeroScene = () =>
  import("@/components/three/hero-scene").then((mod) => mod.HeroScene);

if (
  typeof window !== "undefined" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  void loadHeroScene();
}

const HeroScene = dynamic(loadHeroScene, { ssr: false });

/**
 * Display size. On a phone the two lines each fit on one row (they are the
 * whole headline there); from `md` up they break onto two stacked words each
 * and scale against the viewport height too, so the composition always fits
 * the first screen.
 */
const DISPLAY_SIZE =
  "text-[clamp(1.9rem,8.4vw,3rem)] md:text-[clamp(2.5rem,min(6.5vw,10vh),5.75rem)]";

/** Entrance delays, in seconds, for the CSS `animate-rise` utility. */
const DELAY = { headline: 0.05, hint: 0.35, cta: 0.5 } as const;

function rise(delay: number) {
  return { "--rise-delay": `${delay}s` } as React.CSSProperties;
}

const facts = ["Est. 2026", "Baguio City", "Remote, nationwide"];

export function HomeHero() {
  const router = useRouter();
  const canShow3D = useCanShow3D();
  const [heroRef, heroInViewport] = useInViewport<HTMLElement>("100px 0px");
  const [built, setBuilt] = useState(false);
  const [showServiceSelect, setShowServiceSelect] = useState(false);

  const handleBuildComplete = useCallback(() => {
    setShowServiceSelect(true);
  }, []);

  const handleServiceProceed = useCallback(
    (categorySlug: string) => {
      router.push(`/contact?category=${encodeURIComponent(categorySlug)}`);
    },
    [router],
  );

  const handleServiceSkip = useCallback(() => {
    router.push("/contact");
  }, [router]);

  return (
    <>
      <section
        id="hero"
        ref={heroRef}
        className="relative h-dvh min-h-[34rem] overflow-hidden bg-linear-to-b from-background to-background/80 pt-16"
      >
        <div className="absolute inset-0">
          <DotPattern className="opacity-100" size="md" fadeStyle="ellipse" />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_75%_65%_at_50%_50%,transparent_45%,var(--background)_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:url('data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]"
        />

        {/*
          Phone: three rows -- headline, the 3D stage (takes all the leftover
          height), then copy and actions in thumb reach. From `md` up the same
          layers are placed on one canvas: the stage fills it, the headline and
          the actions float over it.
        */}
        <div className="relative grid h-full grid-rows-[auto_minmax(13rem,1fr)_auto] gap-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 md:block md:gap-0 md:p-0">
          <div className="pointer-events-none z-20 md:absolute md:inset-0 md:mx-auto md:max-w-7xl md:px-8">
            <p
              className="animate-rise mb-3 flex items-center gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground md:absolute md:left-8 md:top-[4%] md:mb-0 md:text-xs"
              style={rise(DELAY.headline)}
            >
              <span aria-hidden="true" className="h-px w-8 bg-foreground/40" />
              Software development &middot; Baguio City
            </p>

            <h1
              className={`font-black uppercase leading-[0.95] tracking-[-0.01em] text-neutral-700 dark:text-foreground [text-shadow:0_0_14px_var(--background),0_0_4px_var(--background)] md:absolute md:inset-0 md:mx-auto md:max-w-7xl md:px-8 ${DISPLAY_SIZE}`}
            >
              <span className="block md:absolute md:left-8 md:top-[10%] md:max-w-[46%]">
                <span className="animate-rise block" style={rise(DELAY.headline)}>
                  Build <span className="md:block">Better.</span>
                </span>
              </span>
              <span className="block md:absolute md:right-8 md:top-[40%] md:max-w-[46%] md:text-right">
                <span className="animate-rise block" style={rise(DELAY.headline)}>
                  Solve{" "}
                  <span
                    className={`md:block ${built ? "bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent [text-shadow:none]" : ""}`}
                  >
                    Smarter.
                  </span>
                </span>
              </span>
            </h1>
          </div>

          <div className="relative z-10 min-h-0 md:absolute md:inset-0">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--foreground)_12%,transparent)_0%,transparent_45%)]"
            />

            {/* Viewfinder frame around the mark. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-1 inset-y-2 md:inset-auto md:left-1/2 md:top-1/2 md:aspect-square md:w-[min(34rem,44vw,64vh)] md:-translate-x-1/2 md:-translate-y-1/2"
            >
              <span className="absolute left-0 top-0 size-5 border-l-2 border-t-2 border-foreground/35" />
              <span className="absolute right-0 top-0 size-5 border-r-2 border-t-2 border-foreground/35" />
              <span className="absolute bottom-0 left-0 size-5 border-b-2 border-l-2 border-foreground/35" />
              <span className="absolute bottom-0 right-0 size-5 border-b-2 border-r-2 border-foreground/35" />
            </div>

            {canShow3D && (
              <CanvasErrorBoundary fallback={null}>
                <HeroScene
                  active={heroInViewport}
                  onBuildStart={() => setBuilt(true)}
                  onBuildComplete={handleBuildComplete}
                />
              </CanvasErrorBoundary>
            )}

            {canShow3D && (
              <div
                aria-hidden={built}
                className={cn(
                  "animate-rise pointer-events-none absolute inset-x-0 bottom-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-[opacity,translate] duration-300 md:bottom-[calc(50%-min(17rem,22vw,32vh)-2.25rem)]",
                  built && "-translate-y-2 opacity-0",
                )}
                style={rise(DELAY.hint)}
              >
                <span className="animate-hint-pulse flex">
                  <MousePointerClick className="size-4" aria-hidden="true" />
                </span>
                <span className="pointer-coarse:hidden">Click</span>
                <span className="hidden pointer-coarse:inline">Tap</span>
                <span>the mark to build it</span>
              </div>
            )}
          </div>

          <div className="pointer-events-none relative z-30 flex flex-col gap-4 md:absolute md:inset-0 md:mx-auto md:block md:max-w-7xl md:px-8">
            <div
              className="animate-rise md:absolute md:bottom-[9%] md:left-8 md:max-w-sm"
              style={rise(DELAY.hint)}
            >
              <p className="text-balance text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
                Practical software for businesses, organizations, and emerging
                ventures.
              </p>
              <ul className="mt-3 hidden gap-x-5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 md:flex">
                {facts.map((fact) => (
                  <li key={fact} className="whitespace-nowrap">{fact}</li>
                ))}
              </ul>
            </div>

            <div
              className="animate-rise pointer-events-auto grid grid-cols-2 gap-2 md:absolute md:bottom-[9%] md:right-8 md:flex md:gap-3"
              style={rise(DELAY.cta)}
            >
              <Button className="group h-11 cursor-pointer rounded-full md:h-10" asChild>
                <Link href="/contact">
                  Contact Us
                  <ArrowRight className="ms-1 size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button
                variant="outline"
                className="group h-11 cursor-pointer rounded-full md:h-10"
                asChild
              >
                <Link href="/portfolio">
                  Our Work
                  <ArrowRight className="ms-1 size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none hidden flex-col items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground md:absolute md:bottom-4 md:left-1/2 md:flex md:-translate-x-1/2"
            >
              Scroll
              <span className="relative h-8 w-px overflow-hidden bg-foreground/20">
                <span className="animate-scroll-cue absolute inset-x-0 top-0 h-3 bg-foreground" />
              </span>
            </div>
          </div>
        </div>
      </section>
      {showServiceSelect && (
        <ServiceSelectOverlay onProceed={handleServiceProceed} onSkip={handleServiceSkip} />
      )}
    </>
  );
}
