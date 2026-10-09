import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

const chapters = [
  {
    label: "The spark",
    text: "Cafton began with a shared interest in software engineering and a common goal: to use technology to solve real-world problems.",
  },
  {
    label: "Baguio City, 2026",
    text: "It was built on the idea that businesses of different sizes should have access to digital solutions suited to their needs.",
  },
  {
    label: "From vision to practice",
    text: "What started as a shared vision has grown into a business focused on helping clients turn ideas into functional systems and everyday challenges into opportunities for improvement.",
  },
  {
    label: "Today",
    text: "We keep building our foundation through client projects, collaboration, and new software products that can benefit businesses and communities.",
  },
];

// Filled with the page colour (stroke painted first) so the overlapping
// contours of the variable font don't show as lines inside the glyphs.
const OUTLINE =
  "text-background [-webkit-text-stroke:1.5px_var(--foreground)] [paint-order:stroke]";

export function OurStory() {
  return (
    <>
    <PageSection className="border-t">
      <PageShell className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Our story
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Where the name comes from.
          </h2>
           <div aria-label="CAF plus TON makes CAFTON" className="mt-10 flex items-start gap-3 sm:gap-5">
            <div>
              <div
                aria-hidden="true"
                className="flex font-black uppercase leading-none tracking-tight text-[clamp(3.75rem,13vw,7rem)]"
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
              className="pt-[0.1em] text-[clamp(2rem,6vw,3.5rem)] font-light leading-none text-muted-foreground/60"
            >
              +
            </span>
            <div>
              <div
                aria-hidden="true"
                className={`inline-block font-black uppercase leading-none tracking-tight text-[clamp(3.75rem,13vw,7rem)] ${OUTLINE}`}
              >
                TON
              </div>
              <p className="mt-3 border-t border-dashed pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                One identity
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-sm text-sm leading-6 text-muted-foreground">
            CAF is the first letters of our three founders&apos; names. TON
            completes it into a name that is distinct and easy to remember.
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
