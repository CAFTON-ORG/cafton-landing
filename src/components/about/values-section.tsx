import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { coreValues as values } from "@/lib/values";

// Filled with the page colour (stroke painted first) so the overlapping
// contours of the variable font don't show as lines inside the glyphs.
const OUTLINE =
  "text-background [-webkit-text-stroke:1.5px_var(--foreground)] [paint-order:stroke]";

export function CoreValues() {
  return (
    <>
    <PageSection>
      <PageShell className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-24">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Core values
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            What guides our work.
          </h2>
          <p className="mt-5 max-w-sm text-muted-foreground">
            Six commitments we hold ourselves to, on every project and in
            every conversation.
          </p>
        </Reveal>
        <RevealGroup>
          <ol className="border-b">
            {values.map((value, index) => (
              <RevealItem as="li" key={value.title} className="group border-t">
                <div className="grid gap-x-8 gap-y-2 py-7 sm:grid-cols-[5rem_1fr] sm:py-9">
                  <span
                    aria-hidden="true"
                    className={`text-5xl font-black leading-none tabular-nums transition-colors duration-300 group-hover:text-foreground sm:text-6xl ${OUTLINE}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">{value.title}</h3>
                    <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
                      {value.description}
                    </p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </ol>
        </RevealGroup>
      </PageShell>
    </PageSection>
    </>
  );
}
