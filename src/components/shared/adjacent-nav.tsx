import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";

interface AdjacentLink {
  href: string;
  title: string;
}

interface AdjacentNavProps {
  /** Noun for the aria label and the small caption, e.g. "service" or "project". */
  noun: string;
  previous?: AdjacentLink;
  next?: AdjacentLink;
}

/** Previous and next entry at the foot of a detail page, so a visitor can keep browsing without going back to the list. */
export function AdjacentNav({ noun, previous, next }: AdjacentNavProps) {
  if (!previous && !next) return null;

  return (
    <div className="border-t">
      <PageShell>
        <nav aria-label={`More ${noun}s`} className="grid sm:grid-cols-2">
          {previous ? (
            <Link
              href={previous.href}
              className="group flex flex-col gap-1 py-8 outline-none transition-colors hover:bg-muted/30 focus-visible:bg-muted/40 sm:border-e sm:pe-8"
            >
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <ArrowLeft
                  className="size-4 transition-transform duration-300 group-hover:-translate-x-1"
                  aria-hidden="true"
                />
                Previous {noun}
              </span>
              <span className="text-lg font-semibold tracking-tight">{previous.title}</span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next && (
            <Link
              href={next.href}
              className="group flex flex-col gap-1 border-t py-8 outline-none transition-colors hover:bg-muted/30 focus-visible:bg-muted/40 sm:items-end sm:border-t-0 sm:ps-8 sm:text-right"
            >
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Next {noun}
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
              <span className="text-lg font-semibold tracking-tight">{next.title}</span>
            </Link>
          )}
        </nav>
      </PageShell>
    </div>
  );
}

/** The entries on either side of `current` in `items`, wrapping around at the ends. */
export function neighbours<T extends { slug: string }>(items: T[], current: string) {
  const index = items.findIndex((item) => item.slug === current);
  if (index === -1 || items.length < 2) return {};
  return {
    previous: items[(index - 1 + items.length) % items.length],
    next: items[(index + 1) % items.length],
  };
}
