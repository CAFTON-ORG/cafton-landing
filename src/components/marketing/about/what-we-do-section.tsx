import { getDocument } from "@/features/cms/repository/documents";
import { ArrowUpRight } from "lucide-react";
import { PageSection, PageShell } from "@/components/marketing/layout/page-shell";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/motion/reveal";

export async function WhatWeDo() {
  const { whatWeDo } = await getDocument("about");
  const specialties = whatWeDo.specialties;
  return (
    <>
    <PageSection>
      <PageShell>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {whatWeDo.eyebrow}
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              {whatWeDo.heading}
            </h2>
          </Reveal>
          <Reveal className="space-y-4 text-lg leading-relaxed text-muted-foreground lg:pt-9">
            {whatWeDo.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Reveal>
        </div>
         <RevealGroup className="mt-14 border-b">
          {specialties.map((item, index) => (
            <RevealItem key={item} className="group border-t">
              <div className="flex items-center gap-5 py-5 transition-transform duration-300 ease-out group-hover:translate-x-3 sm:gap-8 sm:py-7">
                <span className="text-xs font-semibold tabular-nums tracking-[0.2em] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-2xl font-bold tracking-tight sm:text-4xl">
                  {item}
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-6 -translate-x-2 translate-y-2 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 sm:size-8"
                />
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </PageShell>
    </PageSection>
    </>
  );
}
