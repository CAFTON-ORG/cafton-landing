import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { TabCount } from "@/components/dashboard/shared/tab-count";
import { cn } from "@/lib/utils";

export type SegmentedItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  active: boolean;
  /** A number shown after the label as a badge (hidden at zero). */
  count?: number;
};

/**
 * The dashboard's one tab style: a muted track with the selected tab raised on it, like Board | Table
 * or All | Draft | Overdue. They are real links, so the view lives in the URL (shareable, Back works)
 * and it needs no JavaScript. The inactive text is deliberately darker than `text-muted-foreground`,
 * which fails WCAG AA on the muted track in light mode. A long set scrolls sideways on a phone.
 */
export function SegmentedNav({ label, items }: { label: string; items: SegmentedItem[] }) {
  return (
    <nav
      aria-label={label}
      className="bg-muted inline-flex max-w-full [scrollbar-width:none] overflow-x-auto rounded-lg p-0.5 [&::-webkit-scrollbar]:hidden"
    >
      {items.map(({ href, label: text, icon: Icon, active, count }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "focus-visible:ring-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none",
            active
              ? "bg-background text-foreground shadow-xs"
              : "text-foreground/70 hover:text-foreground",
          )}
        >
          {Icon && <Icon className="size-4" aria-hidden="true" />}
          {text}
          {count !== undefined && <TabCount n={count} />}
        </Link>
      ))}
    </nav>
  );
}
