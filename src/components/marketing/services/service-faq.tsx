import { PageSection, PageShell } from "@/components/marketing/layout/page-shell";
import { Reveal } from "@/components/marketing/motion/reveal";
import { FaqList } from "@/components/marketing/patterns/faq";
import type { FaqItem, ServicesDetail } from "@/features/cms/types";

export function ServiceFaq({
  items,
  detail,
}: {
  items: FaqItem[];
  detail: Pick<ServicesDetail, "faqEyebrow" | "faqHeading">;
}) {
  if (items.length === 0) return null;

  return (
    <PageSection className="border-t">
      <PageShell className="grid gap-10 lg:grid-cols-[1fr_1.8fr] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {detail.faqEyebrow}
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {detail.faqHeading}
          </h2>
        </Reveal>
        <Reveal>
          <FaqList items={items} />
        </Reveal>
      </PageShell>
    </PageSection>
  );
}
