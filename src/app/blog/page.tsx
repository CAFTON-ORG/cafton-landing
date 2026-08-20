import { PageHero, PageShell } from "@/components/layout/page-shell";

export default function Blog() {
  return (
    <PageHero>
      <PageShell>
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
          Insights
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Notes from Cafton.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Articles and updates are coming soon.
        </p>
      </PageShell>
    </PageHero>
  );
}
