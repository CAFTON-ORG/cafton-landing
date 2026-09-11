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
 * Server-rendered underline tab bar (plain links + a query param) for any
 * list page. Renders nothing with 0-1 categories. The corner-bracket hover
 * accent matches the same reticle nod used by the navbar and the service
 * picker, rather than introducing a third tab language of its own.
 */
export function CategoryFilter({ categories, active, basePath }: CategoryFilterProps) {
  if (categories.length <= 1) return null;

  const tabs = ["All", ...categories];

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab === "All" ? !active : active === tab;
        const href = tab === "All" ? basePath : `${basePath}?category=${encodeURIComponent(tab)}`;
        return (
          <Link
            key={tab}
            href={href}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {!isActive && <CornerBrackets size="sm" />}
            {tab}
          </Link>
        );
      })}
    </div>
  );
}
