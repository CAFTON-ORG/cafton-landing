import { getDocument } from "@/features/cms/repository/documents";
import { PageSection, PageShell } from "@/components/marketing/layout/page-shell";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/motion/reveal";

// Filled with the page colour (stroke painted first) so the overlapping
// contours of the variable font don't show as lines inside the glyphs.
export async function OurStory() {
  const { story } = await getDocument("about");
  const chapters = story.chapters;
  return (
    <>
    <PageSection className="border-t">
      <PageShell className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {story.eyebrow}
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {story.heading}
          </h2>
           <div aria-label="CAF plus TON makes CAFTON" className="mt-10 flex items-start gap-3 sm:gap-5">
            <div>
              <div
                aria-hidden="true"
                className="flex font-black uppercase leading-none tracking-[0.01em] text-[clamp(3.75rem,13vw,7rem)]"
              >
                {["C", "A", "F"].map((letter) => (
                  <span
                    key={letter}
                    className="inline-block transition-transform duration-300 ease-out hover:-translate-y-2"
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <p className="mt-3 border-t border-dashed pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Three founders
              </p>
            </div>
            <span
              aria-hidden="true"
              className="flex h-[clamp(3.75rem,13vw,7rem)] items-center text-[clamp(2rem,6vw,3.5rem)] font-light leading-none text-muted-foreground/60"
            >
              +
            </span>
            <div>
              <div
                aria-hidden="true"
                className="text-outline inline-block font-black uppercase leading-none tracking-[0.01em] text-[clamp(3.75rem,13vw,7rem)]"
              >
                TON
              </div>
              <p className="mt-3 border-t border-dashed pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                One identity
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-sm text-sm leading-6 text-muted-foreground">
            {story.nameCaption}
          </p>
        </Reveal>
         <RevealGroup>
          <ol className="relative border-l pl-8 sm:pl-10">
            {chapters.map((chapter, index) => (
              <RevealItem as="li" key={chapter.label} className="relative pb-12 last:pb-0">
                <span
                  aria-hidden="true"
                  className="absolute -left-[2.4rem] top-1 size-3 rounded-full border-2 border-foreground bg-background sm:-left-[2.9rem]"
                />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                  {" · "}
                  {chapter.label}
                </p>
                <p className="mt-3 text-lg leading-relaxed sm:text-xl">{chapter.text}</p>
              </RevealItem>
            ))}
          </ol>
        </RevealGroup>
      </PageShell>
    </PageSection>
    </>
  );
}
