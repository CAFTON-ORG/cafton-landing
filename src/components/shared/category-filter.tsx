"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CornerBrackets } from "@/components/shared/corner-brackets";

interface CategoryFilterProps {
  categories: string[];
  /** Currently active category, or undefined for "All". */
  active?: string;
  /** Route the list lives at, e.g. "/portfolio". */
  basePath: string;
}

/**
 * Underline filter bar (plain links + a query param) for any list page.
 * Renders nothing with 0-1 categories. These are navigation links, not
 * tabpanel switchers, so it is a labelled `nav` with `aria-current` rather
 * than a `tablist`. On narrow screens it stays a single swipeable row that
 * bleeds to the screen edges instead of wrapping into broken underlines, and
 * the active filter is scrolled into view so it is never hidden off-screen.
 * The corner-bracket hover accent matches the navbar and the service picker.
 */
export function CategoryFilter({ categories, active, basePath }: CategoryFilterProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !current) return;
    list.scrollTo({
      left: current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2,
    });
  }, [active]);

  if (categories.length <= 1) return null;

  const tabs = ["All", ...categories];

  return (
    <nav aria-label="Filter by category">
      <ul
        ref={listRef}
        className="-mx-5 flex snap-x items-center gap-1 overflow-x-auto overscroll-x-contain border-b border-border px-5 scrollbar-none sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
      >
        {tabs.map((tab) => {
          const isActive = tab === "All" ? !active : active === tab;
          const href =
            tab === "All" ? basePath : `${basePath}?category=${encodeURIComponent(tab)}`;
          return (
            <li key={tab} className="shrink-0 snap-start">
              <Link
                href={href}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative -mb-px flex min-h-11 items-center whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {!isActive && <CornerBrackets size="sm" />}
                {tab}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
