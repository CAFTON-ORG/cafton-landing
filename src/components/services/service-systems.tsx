import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal, RevealItem } from "@/components/motion/reveal";
import type { ServiceSystem } from "@/lib/services";

/** The systems under a service: an intro that stays in view beside a numbered list, so a long list never leaves the page's purpose behind. */
export function ServiceSystems({ systems }: { systems: ServiceSystem[] }) {
  return (
    <PageSection>
      <PageShell className="grid gap-10 lg:grid-cols-[1fr_1.8fr] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            What&apos;s inside
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {systems.length} systems we build under this service.
          </h2>
          <p className="mt-4 max-w-sm text-muted-foreground">
            Start with one, or combine several. They are designed to share the same data.
          </p>
        </Reveal>

        <ol className="border-b">
          {systems.map((system, index) => (
            <RevealItem as="li" key={system.title} index={index} className="border-t">
              <div className="flex gap-5 py-6 sm:gap-8 sm:py-8">
                <span className="pt-1 text-xs font-semibold tabular-nums tracking-[0.2em] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xl font-bold tracking-tight sm:text-2xl">{system.title}</h3>
                  <p className="mt-2 text-pretty leading-7 text-muted-foreground">
                    {system.description}
                  </p>
                </div>
              </div>
            </RevealItem>
          ))}
        </ol>
      </PageShell>
    </PageSection>
  );
}
