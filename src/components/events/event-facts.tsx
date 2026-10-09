import { getEventFacts } from "@/lib/events";
import { cn } from "@/lib/utils";
import type { CaftonEvent } from "@/types/content";

/** The ticket-stub list of facts (when, prizes, how to enter) with dashed rules between rows. */
export function EventFacts({ event, className }: { event: CaftonEvent; className?: string }) {
  return (
    <dl className={cn("max-w-xl text-sm", className)}>
      {getEventFacts(event).map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-6 border-t border-dashed py-3 last:border-b"
        >
          <dt className="font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
