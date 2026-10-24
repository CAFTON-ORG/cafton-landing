import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Crumb {
  name: string;
  /** Omit on the current page, which is shown as plain text. */
  href?: string;
}

/** Visible trail above a detail page's title; the same path is also sent as BreadcrumbList structured data. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("mb-6", className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.name} className="flex min-w-0 items-center gap-1.5">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="rounded-sm py-1 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  {item.name}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn("truncate py-1", last && "max-w-[16rem] font-medium text-foreground sm:max-w-md")}
                >
                  {item.name}
                </span>
              )}
              {!last && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
