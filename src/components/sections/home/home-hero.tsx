"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/shared/dot-pattern";
import Link from "next/link";

const smoothScrollTo = (targetId: string) => {
  const element = document.querySelector(targetId);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

export function HomeHero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-linear-to-b from-background to-background/80 pt-16 sm:pt-20 pb-24"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <DotPattern className="opacity-100" size="md" fadeStyle="ellipse" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Main Headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            We don't start with software.
            <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {" "}
              We start with the problem.{" "}
            </span>
          </h1>

          {/* Subheading */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Cafton engineers custom software, web and mobile applications, and
            SaaS products around the way organizations actually work.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-row gap-4 justify-center">
            <Button className="cursor-pointer group" asChild>
              <Link href="/contact">
                Start a Project
                <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="outline" className="cursor-pointer group" asChild>
              <Link href="/portfolio">
                Explore Our Work
                <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
