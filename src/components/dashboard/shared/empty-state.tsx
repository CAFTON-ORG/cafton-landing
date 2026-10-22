import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** What to show instead of an empty list: say what is missing and offer the next step. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Smaller, for the inside of a card or a side panel. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        compact
          ? "flex flex-col items-center justify-center gap-2 px-4 py-6 text-center"
          : "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "bg-muted text-muted-foreground flex items-center justify-center rounded-full",
            compact ? "size-9" : "size-12",
          )}
        >
          <Icon className={compact ? "size-4" : "size-5"} aria-hidden="true" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className={cn("font-medium", compact && "text-sm")}>{title}</h3>
        {description && (
          <p className={cn("text-muted-foreground max-w-sm text-sm", compact && "text-xs")}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
