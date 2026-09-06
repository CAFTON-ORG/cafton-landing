import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Route the list lives at, e.g. "/portfolio" -- page 1 links back to the bare path. */
  basePath: string;
}

/** Shared numbered pager for any list page (portfolio, blog, ...). Renders nothing for a single page. */
export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageHref = (page: number) => (page <= 1 ? basePath : `${basePath}?page=${page}`);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
      <PageArrow href={pageHref(currentPage - 1)} disabled={currentPage <= 1} label="Previous page">
        <ChevronLeft className="size-4" />
      </PageArrow>
      {pages.map((page) => (
        <Link
          key={page}
          href={pageHref(page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={cn(
            "flex size-9 items-center justify-center rounded-md border text-sm font-medium transition-colors",
            page === currentPage
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
          )}
        >
          {page}
        </Link>
      ))}
      <PageArrow href={pageHref(currentPage + 1)} disabled={currentPage >= totalPages} label="Next page">
        <ChevronRight className="size-4" />
      </PageArrow>
    </nav>
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
  const className = "flex size-9 items-center justify-center rounded-md border transition-colors";

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
