import { getDocument } from "@/features/cms/repository/documents";
import { PageHero } from "@/components/marketing/layout/page-shell";
import { RevealGroup, RevealItem } from "@/components/marketing/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { TeamPhoto } from "@/components/marketing/about/team-photo";
import { getSiteSettings } from "@/features/cms/repository/site";

export async function AboutHero() {
  const { facts } = await getSiteSettings();
  const { hero } = await getDocument("about");
  return (
    <>
    <PageHero image={<TeamPhoto src={hero.photo} alt={hero.photoAlt} />}>
      <RevealGroup>
        <RevealItem className="mb-4">
          <Badge variant="outline" className="px-3 py-1 text-sm">{hero.eyebrow}</Badge>
        </RevealItem>
        <RevealItem>
          <h1 className="max-w-xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            {hero.headlineStart}{" "}
            <span className="underline decoration-foreground/30 decoration-2 underline-offset-8">
              {hero.headlineEmphasis}
            </span>
            {hero.headlineEnd}
          </h1>
        </RevealItem>
        <RevealItem>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            {hero.intro}
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
