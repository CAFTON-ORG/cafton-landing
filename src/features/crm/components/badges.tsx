import { StatusBadge, type StatusTone } from "@/components/dashboard/shared/status-badge";
import { taskUrgency, type LeadStatus } from "../rules";
import { LEAD_STATUS_LABEL, type DealView } from "../types";

const LEAD_TONE: Record<LeadStatus, StatusTone> = {
  new: "info",
  qualified: "success",
  disqualified: "neutral",
  converted: "accent",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <StatusBadge tone={LEAD_TONE[status]}>{LEAD_STATUS_LABEL[status]}</StatusBadge>;
}

/** Open stages read as "in progress" (blue); closing stages as the outcome they are. */
export function StageBadge({ deal }: { deal: Pick<DealView, "stageName" | "stageKind"> }) {
  const tone: StatusTone =
    deal.stageKind === "won" ? "success" : deal.stageKind === "lost" ? "danger" : "info";
  return <StatusBadge tone={tone}>{deal.stageName}</StatusBadge>;
}

const URGENCY: Record<ReturnType<typeof taskUrgency>, { label: string; tone: StatusTone }> = {
  overdue: { label: "Overdue", tone: "danger" },
  today: { label: "Due today", tone: "warning" },
  upcoming: { label: "Upcoming", tone: "neutral" },
  none: { label: "No date", tone: "neutral" },
  done: { label: "Done", tone: "success" },
};

export function UrgencyBadge({ dueAt, doneAt }: { dueAt?: string; doneAt?: string }) {
  const { label, tone } =
    URGENCY[
      taskUrgency({
        dueAt: dueAt ? new Date(dueAt) : null,
        doneAt: doneAt ? new Date(doneAt) : null,
      })
    ];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
