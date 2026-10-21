import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { Skeleton } from "@/components/dashboard/ui/skeleton";
import { cn } from "@/lib/utils";

/** A single headline metric. `loading` renders a same-size skeleton so the layout does not jump. */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  loading = false,
  className,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-muted-foreground text-sm">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          )}
          {hint && !loading && <p className="text-muted-foreground text-xs">{hint}</p>}
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
}
