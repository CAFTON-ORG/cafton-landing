import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getServicePillar } from "@/lib/services";
import type { Project } from "@/types/content";

/** The at-a-glance facts of a case study, set as a ruled list that stays beside the write-up on wide screens. */
export function ProjectFacts({ project }: { project: Project }) {
  const services = project.services
    .map((slug) => getServicePillar(slug))
    .filter((pillar): pillar is NonNullable<typeof pillar> => Boolean(pillar));

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Client", value: project.client },
    { label: "Type", value: project.category },
    {
      label: "Services",
      value: (
        <ul className="space-y-1">
          {services.map((pillar) => (
            <li key={pillar.slug}>
              <Link
                href={`/services/${pillar.slug}`}
                className="underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
              >
                {pillar.title}
              </Link>
            </li>
          ))}
        </ul>
      ),
    },
  ];
  if (project.liveUrl) {
    rows.push({
      label: "Live site",
      value: (
        <a
          href={project.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
        >
          {new URL(project.liveUrl).hostname.replace(/^www\./, "")}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      ),
    });
  }

  return (
    <dl className="text-sm">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1 border-t py-4 first:border-t-0 first:pt-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {row.label}
          </dt>
          <dd className="font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
