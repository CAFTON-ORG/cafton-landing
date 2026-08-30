"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/shared/dot-pattern";
import { useCanShow3D } from "@/hooks/use-can-show-3d";
import { useInViewport } from "@/hooks/use-in-viewport";

gsap.registerPlugin(ScrollTrigger);

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

const HEADLINE_SWAP_THRESHOLD = 0.08;

const SWAP_DELAY = { line1: 0.1, line2: 0.1 } as const;

function entrance(delay: number) {
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: ENTRANCE_DURATION, delay, ease: EASE_OUT },
  } as const;
}

export function HomeHero() {
  const canShow3D = useCanShow3D();
  const reduceMotion = useReducedMotion();
  const [heroRef, heroInViewport] = useInViewport<HTMLElement>();
  const [showPayoff, setShowPayoff] = useState(false);
  const lastShowPayoff = useRef(false);

  const anim = (delay: number) => (reduceMotion ? {} : entrance(delay));

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: "#hero",
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => {
        const next = self.progress > HEADLINE_SWAP_THRESHOLD;
        if (next !== lastShowPayoff.current) {
          lastShowPayoff.current = next;
          setShowPayoff(next);
        }
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative h-[200vh] md:h-[320vh]"
    >
      <div className="sticky top-16 h-[calc(100dvh-4rem)] overflow-hidden bg-linear-to-b from-background to-background/80">
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
              <AnimatePresence mode="wait" initial={!reduceMotion}>
                {showPayoff ? (
                  <motion.span
                    key="line1-payoff"
                    {...(reduceMotion ? {} : entrance(SWAP_DELAY.line1))}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -24 }}
                    className="block"
                  >
                    We <span className="block">start</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="line1-opening"
                    {...anim(ENTRANCE_DELAY.line1)}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -24 }}
                    className="block"
                  >
                    We don&apos;t <span className="block">start</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <span className="block md:absolute md:right-8 md:top-[40%] md:max-w-[46%] md:text-right">
              <AnimatePresence mode="wait" initial={!reduceMotion}>
                {showPayoff ? (
                  <motion.span
                    key="line2-payoff"
                    {...(reduceMotion ? {} : entrance(SWAP_DELAY.line2))}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -24 }}
                    className="block"
                  >
                    with the{" "}
                    <span className="block bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      problem.
                    </span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="line2-opening"
                    {...anim(ENTRANCE_DELAY.line2)}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -24 }}
                    className="block"
                  >
                    with{" "}
                    <span className="block bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      software.
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </h1>

          <div className="relative z-10 min-h-0 md:absolute md:inset-0">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--foreground)_12%,transparent)_0%,transparent_45%)]"
            />
            {canShow3D && <HeroScene active={heroInViewport} />}
          </div>

          <div className="pointer-events-none relative z-30 flex flex-col gap-5 md:absolute md:inset-0 md:mx-auto md:block md:max-w-7xl md:px-8">
            <motion.p
              {...anim(ENTRANCE_DELAY.subhead)}
              className="pointer-events-auto max-w-md text-sm leading-6 text-muted-foreground sm:text-base md:absolute md:left-8 md:top-[46%] md:max-w-68"
            >
              Cafton engineers custom software, web and mobile applications, and
              SaaS products around the way organizations actually work.
            </motion.p>

            <motion.div
              {...anim(ENTRANCE_DELAY.cta)}
              className="pointer-events-auto flex flex-col flex-wrap gap-2 md:absolute md:flex-row md:right-8 md:bottom-[11%] md:justify-end"
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
      </div>
    </section>
  );
}
