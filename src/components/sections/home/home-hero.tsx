"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/shared/dot-pattern";
import Link from "next/link";
import { useCanShow3D } from "@/hooks/use-can-show-3d";

gsap.registerPlugin(ScrollTrigger);

const HeroScene = dynamic(
  () => import("@/components/three/hero-scene").then((mod) => mod.HeroScene),
  { ssr: false },
);

const REVEAL_END = 0.6;

export function HomeHero() {
  const canShow3D = useCanShow3D();

  const headlineLine1Ref = useRef<HTMLSpanElement>(null);
  const headlineLine2Ref = useRef<HTMLSpanElement>(null);
  const subheadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!canShow3D) return;

    const line1 = headlineLine1Ref.current;
    const line2 = headlineLine2Ref.current;
    const subhead = subheadRef.current;
    const cta = ctaRef.current;
    if (!line1 || !line2 || !subhead || !cta) return;

    const ctx = gsap.context(() => {

      gsap.fromTo(
        line1,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
      );

      gsap.set([line2, subhead, cta], { opacity: 0, y: 24 });

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
  
    <section id="hero" className="relative h-[200vh] md:h-[320vh]">
   
      <div className="sticky top-16 grid h-[calc(100vh-4rem)] grid-rows-[45%_auto] items-center overflow-hidden bg-linear-to-b from-background to-background/80 md:grid-cols-2 md:grid-rows-1">
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


        <div className="relative order-1 h-full w-full md:order-2">
       
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
