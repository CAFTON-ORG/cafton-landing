import { cn } from "@/lib/utils";
import type { EventStatus } from "@/lib/events";

const STATUS: Record<EventStatus, { label: string; dot: string }> = {
  open: { label: "Open", dot: "bg-emerald-500" },
  upcoming: { label: "Upcoming", dot: "bg-amber-500" },
  closed: { label: "Closed", dot: "bg-muted-foreground" },
};

interface EventStatusBadgeProps {
  status: EventStatus;
  className?: string;
}

/** Status is always spelled out; the coloured dot is only a secondary cue. */
export function EventStatusBadge({ status, className }: EventStatusBadgeProps) {
  const { label, dot } = STATUS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          dot,
          status === "open" && "motion-safe:animate-pulse",
        )}
      />
      {label}
    </span>
  );
}
