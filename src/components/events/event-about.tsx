import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/motion/reveal";

export function EventAbout({ paragraphs }: { paragraphs: string[] }) {
  return (
    <PageSection>
      <PageShell className="max-w-3xl">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">About the event</h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Reveal>
      </PageShell>
    </PageSection>
  );
}
