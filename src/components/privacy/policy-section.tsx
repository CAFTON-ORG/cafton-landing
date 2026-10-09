import { Reveal } from "@/components/motion/reveal";

export function PolicySection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <section id={id} className="scroll-mt-24 border-t pt-8">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <div className="mt-4 space-y-4 leading-relaxed text-muted-foreground">{children}</div>
      </section>
    </Reveal>
  );
}
