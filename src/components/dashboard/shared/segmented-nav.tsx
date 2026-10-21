import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type SegmentedItem = { href: string; label: string; icon?: LucideIcon; active: boolean };

/**
 * A small set of links that look like a toggle: Board | Table, Open | Done.
 * They are real links, so the view lives in the URL (shareable, Back works) and
 * it needs no JavaScript. The inactive text is deliberately darker than
 * `text-muted-foreground`, which fails WCAG AA on the muted track in light mode.
 */
export function SegmentedNav({ label, items }: { label: string; items: SegmentedItem[] }) {
  return (
    <nav aria-label={label} className="bg-muted inline-flex rounded-lg p-0.5">
      {items.map(({ href, label: text, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "focus-visible:ring-ring inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
            active
              ? "bg-background text-foreground shadow-xs"
              : "text-foreground/70 hover:text-foreground",
          )}
        >
          {Icon && <Icon className="size-4" aria-hidden="true" />}
          {text}
        </Link>
      ))}
    </nav>
  );
}
