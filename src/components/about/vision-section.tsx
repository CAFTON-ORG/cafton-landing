import { PageShell } from "@/components/layout/page-shell";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { DotPattern } from "@/components/shared/dot-pattern";

// Filled with the page colour (stroke painted first) so the overlapping
// contours of the variable font don't show as lines inside the glyphs.
const OUTLINE =
  "text-background [-webkit-text-stroke:1.5px_var(--foreground)] [paint-order:stroke]";

export function VisionMission() {
  return (
    <>
    <section className="relative overflow-hidden border-y bg-muted/30 py-20 sm:py-24 lg:py-32">
      <div className="pointer-events-none absolute inset-0">
        <DotPattern size="md" fadeStyle="ellipse" opacity="low" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_0%,color-mix(in_oklch,var(--foreground)_9%,transparent)_0%,transparent_55%)]"
      />
      <PageShell className="relative">
        <Reveal className="relative max-w-5xl">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-2 -top-16 select-none text-[12rem] font-black leading-none text-foreground/[0.07] sm:-left-6 sm:-top-24 sm:text-[18rem]"
          >
            &ldquo;
          </span>
          <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Our vision
          </p>
          <p className="relative mt-5 text-balance text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            To become a trusted technology company that transforms ideas and
            real-world challenges into innovative digital solutions that
            create lasting value for businesses and communities.
          </p>
        </Reveal>
         <RevealGroup className="mt-16 grid gap-12 md:grid-cols-2 md:gap-16 lg:mt-24">
          {[
            {
              initial: "M",
              label: "Our mission",
              text: "To help businesses, organizations, and emerging ventures solve real-world challenges through reliable, user-centered, and innovative digital solutions, combining software engineering and collaborative development to turn ideas into practical products.",
            },
            {
              initial: "G",
              label: "Our goal",
              text: "To establish Cafton as a sustainable software development company that delivers practical and innovative solutions while building long-term client relationships, developing its own products, and contributing to the digital transformation of businesses and communities.",
            },
          ].map((item) => (
            <RevealItem key={item.label} className="grid grid-cols-[auto_1fr] gap-6 border-t pt-6">
              <span
                aria-hidden="true"
                className={`text-7xl font-black leading-none sm:text-8xl ${OUTLINE}`}
              >
                {item.initial}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-3 text-lg leading-relaxed">{item.text}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </PageShell>
    </section>
    </>
  );
}
