import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import type { EventPromo as EventPromoData } from "@/types/content";

/** A product or service the event ties into, set as a wide statement with two actions. */
export function EventPromo({ promo }: { promo: EventPromoData }) {
  return (
    <PageSection className="border-t">
      <PageShell>
        <Reveal className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {promo.eyebrow}
            </p>
            <h2 className="mt-4 text-balance text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
              {promo.title}
            </h2>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">{promo.description}</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button asChild size="lg" className="group cursor-pointer">
              <a href={promo.href} target="_blank" rel="noopener noreferrer">
                {promo.cta}
                <ArrowUpRight className="ms-2 size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="cursor-pointer">
              <Link href="/contact">Talk to us</Link>
            </Button>
          </div>
        </Reveal>
      </PageShell>
    </PageSection>
  );
}
