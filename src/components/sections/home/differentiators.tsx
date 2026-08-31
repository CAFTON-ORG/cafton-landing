"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "motion/react";
import { Search, Layers3, Users } from "lucide-react";
import { DotPattern } from "@/components/shared/dot-pattern";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { PageShell } from "@/components/layout/page-shell";
import { useCanShow3D } from "@/hooks/use-can-show-3d";
import { CanvasErrorBoundary } from "@/components/three/canvas-error-boundary";
import { ScrollScrubVideo } from "@/components/sections/home/scroll-scrub-video";

gsap.registerPlugin(ScrollTrigger);

const DifferentiatorsMark = dynamic(
  () =>
    import("@/components/three/differentiators-mark").then(
      (mod) => mod.DifferentiatorsMark
    ),
  { ssr: false }
);

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const NUMBER_SIZE = "text-[clamp(4.5rem,min(20vw,36vh),12rem)]";

const TITLE_SIZE = "text-[clamp(2rem,6vw,4.5rem)]";

const values = [
  {
    icon: Search,
    title: "Problem First",
    description:
      "We understand the workflow before deciding on the technology.",
  },
  {
    icon: Layers3,
    title: "End-to-End",
    description:
      "We work across architecture, backend, database, web, mobile, APIs, and deployment.",
  },
  {
    icon: Users,
    title: "Built Together",
    description:
      "Three founders with years of experience working together, not a disconnected team assembled for a project.",
  },
];

function StaticDifferentiators() {
  const [lead, ...rest] = values;

  return (
    <section id="why-cafton" className="relative py-14 sm:py-16 lg:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-r from-primary/8 via-transparent to-secondary/20"
      />
      <DotPattern className="opacity-75" size="md" fadeStyle="circle" />

      <PageShell className="relative">
        <Reveal className="mb-12 max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Not just another development team
          </h2>
          <p className="text-lg text-muted-foreground">
            Software development is easy to describe. Understanding what
            software should actually be built is harder.
          </p>
        </Reveal>

        <RevealGroup className="grid max-w-4xl gap-10 sm:grid-cols-2">
          <RevealItem className="flex flex-col gap-3 border-t border-border pt-6 sm:col-span-2 sm:flex-row sm:items-start sm:gap-6">
            <lead.icon className="size-6 shrink-0 text-foreground" aria-hidden="true" />
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold ">{lead.title}</h3>
              <p className="max-w-md text-muted-foreground">{lead.description}</p>
            </div>
          </RevealItem>
          {rest.map((value, index) => (
            <RevealItem
              key={index}
              className="flex flex-col gap-3 border-t border-border pt-6"
            >
              <value.icon className="size-5 text-foreground" aria-hidden="true" />
              <h3 className="font-semibold ">{value.title}</h3>
              <p className="text-sm text-muted-foreground">
                {value.description}
              </p>
            </RevealItem>
          ))}
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

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top top",
      end: "bottom top",
      scrub: 1,
      onUpdate: (self) => {
        progress.current = self.progress;
        const index = Math.min(
          values.length - 1,
          Math.floor(self.progress * HOLD_SEGMENTS)
        );
        if (index !== lastIndex.current) {
          lastIndex.current = index;
          setActiveIndex(index);
        }
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  const active = values[activeIndex];
  const number = String(activeIndex + 1).padStart(2, "0");

  return (
    <section id="why-cafton" ref={sectionRef} className="relative h-[400vh]">
      <h2 className="sr-only">Not just another development team</h2>

      <div className="sticky top-16 h-[calc(100dvh-4rem)] overflow-hidden border-y">
        <ScrollScrubVideo
          progressRef={progress}
          className="absolute inset-0 h-full w-full"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-background/70" />
        <div className="pointer-events-none absolute inset-0">
          <DotPattern className="opacity-60" size="md" fadeStyle="ellipse" />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--foreground)_10%,transparent)_0%,transparent_55%)]"
        />
        <div className="relative grid h-full grid-rows-[auto_1fr_auto] gap-6 px-5 pb-14 pt-8 md:block md:gap-0 md:p-0">
          <div className="pointer-events-none z-20 md:absolute md:inset-0 md:mx-auto md:max-w-7xl md:px-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground md:absolute md:left-8 md:top-[2%]">
              Why Cafton &mdash; {activeIndex + 1} of {values.length}
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
                className="md:absolute md:left-8 md:top-[8%] md:max-w-[85%]"
              >
                <span
                  aria-hidden="true"
                  className={`block font-black uppercase leading-none text-transparent [-webkit-text-stroke:1.5px_var(--foreground)] [paint-order:stroke] ${NUMBER_SIZE}`}
                >
                  {number}
                </span>
                <h3
                  className={`mt-3 flex items-center gap-3 font-black uppercase leading-[0.95] tracking-tight ${TITLE_SIZE}`}
                >
                  <active.icon className="size-8 shrink-0 md:size-10" aria-hidden="true" />
                  {active.title}
                </h3>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative z-10 min-h-0 md:absolute md:inset-0">
            <CanvasErrorBoundary fallback={null}>
              <DifferentiatorsMark progressRef={progress} />
            </CanvasErrorBoundary>
          </div>

          <div className="pointer-events-none relative z-30 md:absolute md:inset-0 md:mx-auto md:max-w-7xl md:px-8">
            <AnimatePresence mode="wait">
              <motion.p
                key={activeIndex}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, delay: 0.1, ease: EASE_OUT }}
                className="pointer-events-auto text-base leading-relaxed text-muted-foreground md:absolute md:bottom-[12%] md:right-8 md:max-w-md md:text-right md:text-xl"
              >
                {active.description}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex justify-center gap-2 md:bottom-8">
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
