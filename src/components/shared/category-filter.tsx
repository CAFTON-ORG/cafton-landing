import Link from "next/link";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: string[];
  /** Currently active category, or undefined for "All". */
  active?: string;
  /** Route the list lives at, e.g. "/portfolio". */
  basePath: string;
}

/** Server-rendered filter bar (plain links + a query param) for any list page. Renders nothing with 0-1 categories. */
export function CategoryFilter({ categories, active, basePath }: CategoryFilterProps) {
  if (categories.length <= 1) return null;

  const tabs = ["All", ...categories];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = tab === "All" ? !active : active === tab;
        const href = tab === "All" ? basePath : `${basePath}?category=${encodeURIComponent(tab)}`;
        return (
          <Link
            key={tab}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {tab}
          </Link>
        );
      })}
    </div>
  );
}
