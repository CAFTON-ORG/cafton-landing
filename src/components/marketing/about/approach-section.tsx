import { getDocument } from "@/features/cms/repository/documents";
import { getSiteSettings } from "@/features/cms/repository/site";
import { Fragment } from "react";
import { PageSection, PageShell } from "@/components/marketing/layout/page-shell";
import { Reveal } from "@/components/marketing/motion/reveal";
import { ProcessGraphic } from "@/components/marketing/about/process-graphic";

// Filled with the page colour (stroke painted first) so the overlapping
// contours of the variable font don't show as lines inside the glyphs.
const OUTLINE =
  "text-background [-webkit-text-stroke:1.5px_var(--foreground)] [paint-order:stroke]";

export async function OurApproach() {
  const { approach } = await getDocument("about");
  const { tagline } = await getSiteSettings();
  return (
    <>
    <PageSection className="overflow-hidden border-t">
      <PageShell>
        <Reveal className="mb-12 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {approach.eyebrow}
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            {approach.heading}
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            {approach.intro}
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
            {tagline.map((line, index) => (
              <Fragment key={line}>
                {index > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </p>
        </Reveal>
      </PageShell>
    </PageSection>
    </>
  );
}
