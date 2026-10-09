import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import type { EventStep } from "@/types/content";

export function EventSteps({ steps }: { steps: EventStep[] }) {
  return (
    <PageSection className="border-t">
      <PageShell>
        <Reveal className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
        </Reveal>
        <RevealGroup className="grid gap-x-10 md:grid-cols-3">
          {steps.map((step, index) => (
            <RevealItem key={step.title} className="border-t pb-8 pt-6 md:pb-0">
              <span className="text-xs font-semibold tabular-nums tracking-[0.2em] text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-5xl font-black uppercase leading-none tracking-tight">
                {step.title}.
              </h3>
              <p className="mt-4 max-w-xs text-muted-foreground">{step.description}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </PageShell>
    </PageSection>
  );
}
