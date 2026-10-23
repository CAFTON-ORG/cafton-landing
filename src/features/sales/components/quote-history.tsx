import {
  Ban,
  Check,
  CircleDashed,
  Clock,
  Eye,
  FilePlus2,
  Send,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { quoteHistory, type HistoryKind, type HistoryTone } from "../history";
import type { QuoteView } from "../types";

const ICON: Record<HistoryKind, LucideIcon> = {
  started: FilePlus2,
  approved: ShieldCheck,
  sent: Send,
  opened: Eye,
  accepted: Check,
  declined: X,
  withdrawn: Ban,
  expired: Clock,
  waiting: CircleDashed,
};

/** Marker colours. Light and dark text colours picked to clear WCAG AA on their tinted ring. */
const TONE: Record<HistoryTone, string> = {
  neutral: "border-border bg-muted text-foreground",
  success:
    "border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/40 dark:text-emerald-300",
  danger: "border-destructive/40 bg-destructive/10 text-red-700 dark:text-red-300",
  warning:
    "border-amber-600/40 bg-amber-500/10 text-amber-800 dark:border-amber-400/40 dark:text-amber-300",
};

const WITH_TIME = { dateStyle: "medium", timeStyle: "short" } as const;

/** What happened to a quote, oldest first, with a muted "what is next" step while it is open. */
export function QuoteHistory({ quote }: { quote: QuoteView }) {
  const events = quoteHistory(quote);

  return (
    <ol className="grid">
      {events.map((event, index) => {
        const Icon = ICON[event.kind];
        const last = index === events.length - 1;
        return (
          <li key={event.kind} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span
                aria-hidden="true"
                className="bg-border absolute top-7 bottom-0 left-3 w-px -translate-x-1/2"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "relative flex size-6 shrink-0 items-center justify-center rounded-full border",
                event.upcoming ? "text-muted-foreground border-dashed" : TONE[event.tone],
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 text-sm">
              <p className={cn("font-medium", event.upcoming && "text-muted-foreground")}>
                {event.title}
              </p>
              {event.detail && !event.upcoming && (
                <p className="text-muted-foreground break-words">{event.detail}</p>
              )}
              {event.at && (
                <p className="text-muted-foreground text-xs">
                  {event.upcoming && event.detail ? `${event.detail} ` : null}
                  <time dateTime={event.at}>
                    {formatDate(event.at, event.hasTime ? WITH_TIME : undefined)}
                  </time>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
