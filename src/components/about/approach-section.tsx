import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/motion/reveal";
import { ProcessGraphic } from "@/components/about/process-graphic";

// Filled with the page colour (stroke painted first) so the overlapping
// contours of the variable font don't show as lines inside the glyphs.
const OUTLINE =
  "text-background [-webkit-text-stroke:1.5px_var(--foreground)] [paint-order:stroke]";

export function OurApproach() {
  return (
    <>
    <PageSection className="overflow-hidden border-t">
      <PageShell>
        <Reveal className="mb-12 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Our approach
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            How we work.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            It starts with the problem: how people work today and what could
            work better tomorrow. Clear thinking and close collaboration
            guide every stage.
          </p>
        </Reveal>
        <Reveal>
          <ProcessGraphic />
        </Reveal>
        <Reveal>
          <p
            aria-hidden="true"
            className={`mt-20 select-none text-center text-[clamp(2.25rem,8.5vw,7rem)] font-black uppercase leading-[0.92] tracking-tight opacity-40 ${OUTLINE}`}
          >
            Build Better.
            <br />
            Solve Smarter.
          </p>
        </Reveal>
      </PageShell>
    </PageSection>
    </>
  );
}
