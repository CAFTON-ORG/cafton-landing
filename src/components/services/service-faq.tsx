import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/motion/reveal";
import { FaqList } from "@/components/shared/faq";
import type { FaqItem } from "@/types/content";

export function ServiceFaq({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;

  return (
    <PageSection className="border-t">
      <PageShell className="grid gap-10 lg:grid-cols-[1fr_1.8fr] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Questions
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Before you get in touch.
          </h2>
        </Reveal>
        <Reveal>
          <FaqList items={items} />
        </Reveal>
      </PageShell>
    </PageSection>
  );
}
