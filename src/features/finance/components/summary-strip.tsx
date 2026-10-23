import Link from "next/link";

import { Card, CardContent } from "@/components/dashboard/ui/card";
import { formatMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface SummaryItem {
  label: string;
  amountMinor: number;
  /** "3 invoices". */
  detail?: string;
  /** Where clicking it goes (the list, filtered). */
  href?: string;
  tone?: "neutral" | "danger" | "warning" | "success";
}

const TONE = {
  neutral: "",
  danger: "text-red-700 dark:text-red-400",
  warning: "text-amber-700 dark:text-amber-400",
  success: "text-emerald-700 dark:text-emerald-400",
} as const;

/**
 * The headline amounts above a list, each a link to that slice of it: what is owed, what is late,
 * what came in. The same strip sits above invoices, bills and expenses so they scan alike.
 */
export function SummaryStrip({ items }: { items: SummaryItem[] }) {
  return (
    <ul className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const body = (
          <Card className={cn("h-full", item.href && "hover:bg-muted/30 transition-colors")}>
            <CardContent className="grid gap-0.5">
              <p className="text-muted-foreground text-xs">{item.label}</p>
              <p
                className={cn(
                  "text-xl font-semibold tracking-tight tabular-nums",
                  TONE[item.tone ?? "neutral"],
                )}
              >
                {formatMinor(item.amountMinor)}
              </p>
              {item.detail && <p className="text-muted-foreground text-xs">{item.detail}</p>}
            </CardContent>
          </Card>
        );
        return (
          <li key={item.label}>
            {item.href ? (
              <Link
                href={item.href}
                className="focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:outline-none"
              >
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;
