import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/dashboard/ui/card";
import { Badge } from "@/components/dashboard/ui/badge";

/**
 * The side panel of a record, the way CRMs lay it out (HubSpot's "About", Pipedrive's "Summary"):
 * ONE card, split into labelled sections, instead of a stack of separate cards that makes the page
 * long. Put what you scan for here (owner, contact details, tags); put work (activity, tasks,
 * meetings) in the tabs of the main column.
 */
export function DetailsPanel({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent className="grid divide-y p-0 [&>section]:px-4 [&>section]:py-4">
        {children}
      </CardContent>
    </Card>
  );
}

export function DetailsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2.5">
      <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</h2>
      {children}
    </section>
  );
}

/** One labelled value in a section: the label above, the value below, nothing when it is empty. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === "" || children === false) {
    return null;
  }
  return (
    <div className="grid gap-0.5 text-sm">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export function Facts({ children }: { children: ReactNode }) {
  return <dl className="grid gap-2.5">{children}</dl>;
}

/** "(3)" after a tab title, when there is something to count. */
export function TabCount({ n }: { n: number }) {
  return n > 0 ? (
    <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 tabular-nums">
      {n}
    </Badge>
  ) : null;
}
