import { PageHero } from "@/components/layout/page-shell";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { TeamPhoto } from "@/components/about/team-photo";

const facts = ["Est. 2026", "Baguio City", "Remote, nationwide"];

export function AboutHero() {
  return (
    <>
    <PageHero image={<TeamPhoto />}>
      <RevealGroup>
        <RevealItem className="mb-4">
          <Badge variant="outline" className="px-3 py-1 text-sm">About</Badge>
        </RevealItem>
        <RevealItem>
          <h1 className="max-w-xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Technology should make work{" "}
            <span className="underline decoration-foreground/30 decoration-2 underline-offset-8">
              easier
            </span>
            , not more complicated.
          </h1>
        </RevealItem>
        <RevealItem>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Cafton is a software development company in Baguio City. We help
            businesses, organizations, and emerging ventures improve their
            operations and serve their customers through practical digital
            solutions.
          </p>
        </RevealItem>
        <RevealItem>
          <ul className="mt-8 inline-flex flex-wrap border-y text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {facts.map((fact) => (
              <li key={fact} className="border-r py-3 pr-5 last:border-r-0 [&:not(:first-child)]:pl-5">
                {fact}
              </li>
            ))}
          </ul>
        </RevealItem>
      </RevealGroup>
    </PageHero>
    </>
  );
}
