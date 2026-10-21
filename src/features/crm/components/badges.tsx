import { Badge } from "@/components/dashboard/ui/badge";
import { cn } from "@/lib/utils";
import { taskUrgency } from "../rules";
import { LEAD_STATUS_LABEL, type DealView } from "../types";
import type { LeadStatus } from "../rules";

const LEAD_STYLE: Record<LeadStatus, string> = {
  new: "bg-primary/10 text-primary",
  qualified: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  disqualified: "bg-muted text-muted-foreground",
  converted: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", LEAD_STYLE[status])}>
      {LEAD_STATUS_LABEL[status]}
    </Badge>
  );
}

export function StageBadge({ deal }: { deal: Pick<DealView, "stageName" | "stageKind"> }) {
  const style =
    deal.stageKind === "won"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : deal.stageKind === "lost"
        ? "bg-destructive/10 text-destructive"
        : "bg-primary/10 text-primary";
  return (
    <Badge variant="outline" className={cn("border-transparent", style)}>
      {deal.stageName}
    </Badge>
  );
}

const URGENCY_LABEL = {
  overdue: "Overdue",
  today: "Due today",
  upcoming: "Upcoming",
  none: "No date",
  done: "Done",
} as const;
const URGENCY_STYLE = {
  overdue: "bg-destructive/10 text-destructive",
  today: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  upcoming: "bg-muted text-muted-foreground",
  none: "bg-muted text-muted-foreground",
  done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
} as const;

export function UrgencyBadge({ dueAt, doneAt }: { dueAt?: string; doneAt?: string }) {
  const urgency = taskUrgency({
    dueAt: dueAt ? new Date(dueAt) : null,
    doneAt: doneAt ? new Date(doneAt) : null,
  });
  return (
    <Badge variant="outline" className={cn("border-transparent", URGENCY_STYLE[urgency])}>
      {URGENCY_LABEL[urgency]}
    </Badge>
  );
}
