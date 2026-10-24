import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export interface AttentionItem {
  text: string;
  detail?: string;
  href: string;
  /** How pressing: red is late or blocked, amber is soon, grey is just to do. */
  tone: "danger" | "warning" | "neutral";
}

const DOT = {
  danger: "bg-red-500",
  warning: "bg-amber-500",
  neutral: "bg-slate-400",
} as const;

/**
 * "Needs your attention": the next things to do, most pressing first, each a link to where it is
 * done. Used on the home overview and the finance overview so both read the same. The dot's colour
 * is never the only signal: the text says what is wrong.
 */
export function AttentionList({
  items,
  emptyText = "Nothing needs your attention.",
}: {
  items: AttentionItem[];
  emptyText?: string;
}) {
  if (items.length === 0)
    return (
      <div className="text-muted-foreground flex items-center gap-2 px-4 py-6 text-sm">
        <CircleCheck className="size-4 text-emerald-600" aria-hidden="true" />
        {emptyText}
      </div>
    );
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.href + item.text}>
          <Link
            href={item.href}
            className="hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3 px-4 py-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <span
              aria-hidden="true"
              className={cn("size-2 shrink-0 rounded-full", DOT[item.tone])}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{item.text}</span>
              {item.detail && (
                <span className="text-muted-foreground block text-xs">{item.detail}</span>
              )}
            </span>
            <ArrowRight className="text-muted-foreground size-4" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
