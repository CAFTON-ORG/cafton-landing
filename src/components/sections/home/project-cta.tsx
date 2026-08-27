"use client";

import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";

const smoothScrollTo = (targetId: string) => {
  document
    .querySelector(targetId)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export function ProjectCta() {
  return (
    <section className="py-14 sm:py-16 lg:py-20 bg-muted/80">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="space-y-8">
           

              {/* Main Content */}
              <div className="space-y-6">
                <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  Have a problem worth solving?
                </h1>

                <p className="text-muted-foreground mx-auto max-w-2xl text-balance lg:text-xl">
                  Tell us what you&apos;re trying to accomplish. We&apos;ll help
                  you figure out what technology can do about it.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col justify-center gap-4 sm:flex-row sm:gap-6">
                <Button className="cursor-pointer group" asChild>
                  <Link href="/contact">
                    Start a Project
                    <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
