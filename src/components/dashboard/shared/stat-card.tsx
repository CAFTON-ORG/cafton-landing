import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { Skeleton } from "@/components/dashboard/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * A single headline metric. `loading` renders a same-size skeleton so the layout does not jump. With
 * `href` the whole card is a link to where the number comes from, which is how a dashboard tile
 * should behave: you see a figure, you click it, you land on the list behind it.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  href,
  tone = "neutral",
  loading = false,
  className,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  href?: string;
  /** Colours the hint: something late is red, something to watch is amber. */
  tone?: "neutral" | "warning" | "danger" | "success";
  loading?: boolean;
  className?: string;
}) {
  const card = (
    <Card className={cn("h-full", href && "hover:bg-muted/30 transition-colors", className)}>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-muted-foreground text-sm">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          )}
          {hint && !loading && (
            <p
              className={cn(
                "text-xs",
                tone === "neutral" && "text-muted-foreground",
                tone === "warning" && "text-amber-700 dark:text-amber-400",
                tone === "danger" && "text-red-700 dark:text-red-400",
                tone === "success" && "text-emerald-700 dark:text-emerald-400",
              )}
            >
              {hint}
            </p>
          )}
        </div>
        <div
          className={cn(
            "bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl",
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link
      href={href}
      className="focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:outline-none"
    >
      {card}
    </Link>
  ) : (
    card
  );
}
