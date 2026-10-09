import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Route the list lives at, e.g. "/portfolio". Page 1 links back to the bare path. */
  basePath: string;
  /** Extra query params (e.g. an active category filter) to preserve across page links. */
  query?: Record<string, string>;
  /** With `pageSize`, adds a "Showing 7-12 of 31" line under the pager. */
  totalItems?: number;
  pageSize?: number;
}

/**
 * The page numbers to show: always the first and last, the current page with
 * one neighbour each side, and "gap" markers between, so 40 pages still fit
 * on a phone. Returns numbers and the string "gap".
 */
export function pageWindow(current: number, total: number): (number | "gap")[] {
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...wanted].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined && page - previous === 2) result.push(previous + 1);
    else if (previous !== undefined && page - previous > 2) result.push("gap");
    result.push(page);
  });
  return result;
}

/** Shared numbered pager for any list page (portfolio, blog, events). Renders nothing for a single page. */
export function Pagination({
  currentPage,
  totalPages,
  basePath,
  query,
  totalItems,
  pageSize,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageHref = (page: number) => {
    const params = new URLSearchParams(query);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = pageSize ? (currentPage - 1) * pageSize + 1 : 0;
  const to = pageSize && totalItems ? Math.min(currentPage * pageSize, totalItems) : 0;

  return (
    <div className="mt-12 flex flex-col items-center gap-4">
      <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
        <PageArrow href={pageHref(currentPage - 1)} disabled={currentPage <= 1} label="Previous page">
          <ChevronLeft className="size-4" />
        </PageArrow>
        {pageWindow(currentPage, totalPages).map((page, index) =>
          page === "gap" ? (
            <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">
              &hellip;
            </span>
          ) : (
            <Link
              key={page}
              href={pageHref(page)}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
              className={cn(
                "flex size-10 items-center justify-center rounded-md border text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring",
                page === currentPage
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
            >
              {page}
            </Link>
          ),
        )}
        <PageArrow href={pageHref(currentPage + 1)} disabled={currentPage >= totalPages} label="Next page">
          <ChevronRight className="size-4" />
        </PageArrow>
      </nav>
      {pageSize && totalItems ? (
        <p className="text-sm text-muted-foreground">
          Showing {from}&ndash;{to} of {totalItems}
        </p>
      ) : null}
    </div>
  );
}

function PageArrow({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  const className =
    "flex size-10 items-center justify-center rounded-md border outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring";

  if (disabled) {
    return (
      <span aria-hidden="true" className={cn(className, "border-border text-muted-foreground/30")}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(className, "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground")}
    >
      {children}
    </Link>
  );
}
