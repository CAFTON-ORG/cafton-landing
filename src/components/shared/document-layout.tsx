import type { ReactNode } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { TableOfContents, type TocItem } from "@/components/shared/table-of-contents";
import { cn } from "@/lib/utils";

interface DocumentLayoutProps {
  toc: TocItem[];
  children: ReactNode;
  className?: string;
}

/** Long-form text (policies, terms) at reading width, with a table of contents beside it on wide screens. */
export function DocumentLayout({ toc, children, className }: DocumentLayoutProps) {
  return (
    <PageShell className="max-w-5xl">
      <div className="grid gap-8 lg:grid-cols-[14rem_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <TableOfContents items={toc} />
        </div>
        <div className={cn("max-w-3xl", className)}>{children}</div>
      </div>
    </PageShell>
  );
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
