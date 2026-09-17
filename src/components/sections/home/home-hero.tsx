"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/shared/dot-pattern";
import { useCanShow3D } from "@/hooks/use-can-show-3d";
import { CanvasErrorBoundary } from "@/components/three/canvas-error-boundary";
import { useInViewport } from "@/hooks/use-in-viewport";
import { ServiceSelectOverlay } from "@/components/sections/home/service-select-overlay";

const HeroScene = dynamic(
  () => import("@/components/three/hero-scene").then((mod) => mod.HeroScene),
  { ssr: false },
);

const DISPLAY_SIZE = "text-[clamp(2.5rem,min(6.5vw,10vh),5.75rem)]";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const ENTRANCE_DURATION = 0.4;
const ENTRANCE_DELAY = {
  line1: 0.1,
  line2: 0.1,
  subhead: 0.65,
  cta: 1.05,
} as const;

function entrance(delay: number) {
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: ENTRANCE_DURATION, delay, ease: EASE_OUT },
  } as const;
}

export function HomeHero() {
  const router = useRouter();
  const canShow3D = useCanShow3D();
  const reduceMotion = useReducedMotion();
  const [heroRef, heroInViewport] = useInViewport<HTMLElement>();
  const [built, setBuilt] = useState(false);
  const [showServiceSelect, setShowServiceSelect] = useState(false);

  const anim = (delay: number) => (reduceMotion ? {} : entrance(delay));

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
        className="relative h-[calc(100dvh-4rem)] overflow-hidden bg-linear-to-b from-background to-background/80"
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
          className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]"
        />

        <div className="relative grid h-full grid-rows-[auto_minmax(12rem,1fr)_auto] gap-5 px-5 pb-10 pt-6 md:block md:gap-0 md:p-0">
          <h1
            className={`pointer-events-none z-20 font-black uppercase leading-[0.95] tracking-[-0.01em] text-foreground  md:absolute md:inset-0 md:mx-auto md:max-w-7xl md:px-8 ${DISPLAY_SIZE}`}
          >
            <span className="block md:absolute md:left-8 md:top-[10%] md:max-w-[46%]">
              <motion.span {...anim(ENTRANCE_DELAY.line1)} className="block">
                Build <span className="block">Better</span>
              </motion.span>
            </span>
            <span className="block md:absolute md:right-8 md:top-[40%] md:max-w-[46%] md:text-right">
              <motion.span {...anim(ENTRANCE_DELAY.line2)} className="block">
                Solve{" "}
                <span
                  className={`block ${built ? "bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent" : ""}`}
                >
                  Smarter
                </span>
              </motion.span>
            </span>
          </h1>

          <div className="relative z-10 min-h-0 md:absolute md:inset-0">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--foreground)_12%,transparent)_0%,transparent_45%)]"
            />
            {canShow3D && (
              <CanvasErrorBoundary fallback={null}>
                <HeroScene
                  active={heroInViewport}
                  onBuildStart={() => setBuilt(true)}
                  onBuildComplete={handleBuildComplete}
                />
              </CanvasErrorBoundary>
            )}
          </div>

          <div className="pointer-events-none relative z-30 flex flex-col gap-5 md:absolute md:inset-0 md:mx-auto md:block md:max-w-7xl md:px-8">
            <AnimatePresence>
              {!built && canShow3D && (
                <motion.div
                  {...anim(ENTRANCE_DELAY.subhead)}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground md:absolute md:left-8 md:bottom-[11%] md:justify-start md:text-left"
                >
                  <motion.span
                    animate={reduceMotion ? undefined : { scale: [1, 1.18, 1] }}
                    transition={
                      reduceMotion
                        ? undefined
                        : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                    }
                    className="flex"
                  >
                    <MousePointerClick className="size-4" aria-hidden="true" />
                  </motion.span>
                  Click the mark to build it
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              {...anim(ENTRANCE_DELAY.cta)}
              className="pointer-events-auto flex flex-col gap-3 md:absolute md:flex-row md:right-8 md:bottom-[11%] md:justify-end"
            >
              <Button className="cursor-pointer group" asChild>
                <Link href="/contact">
                  Contact Us
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
            </motion.div>
          </div>
        </div>
      </section>
      {showServiceSelect && (
        <ServiceSelectOverlay onProceed={handleServiceProceed} onSkip={handleServiceSkip} />
      )}
    </>
  );
}
