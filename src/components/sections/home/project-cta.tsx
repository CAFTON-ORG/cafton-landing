import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/shared/dot-pattern";
import { Reveal } from "@/components/motion/reveal";

export function ProjectCta() {
  return (
    <section className="py-14 sm:py-16 lg:py-20">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative w-full overflow-hidden rounded-2xl border bg-card">
         
            <div className="pointer-events-none absolute inset-0">
              <DotPattern size="md" fadeStyle="ellipse" opacity="low" />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--foreground)_10%,transparent)_0%,transparent_65%)]"
            />

            <div className="relative px-6 py-16 text-center sm:px-12 sm:py-20">
              <h2 className="mx-auto max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                Have a problem worth solving?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-balance text-muted-foreground sm:text-lg">
                Tell us what you&apos;re trying to accomplish. We&apos;ll help
                you figure out what technology can do about it.
              </p>
              <div className="mt-9 flex justify-center">
                <Button size="lg" className="cursor-pointer group" asChild>
                  <Link href="/contact">
                    Contact Us
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
