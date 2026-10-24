import { StatusBadge, type StatusTone } from "@/components/dashboard/shared/status-badge";
import { QUOTE_STATUS_LABEL, type QuoteStatus } from "../rules/core";

const TONE: Record<QuoteStatus, StatusTone> = {
  draft: "neutral",
  pending_approval: "warning",
  approved: "info",
  sent: "info",
  accepted: "success",
  declined: "danger",
  expired: "neutral",
  superseded: "neutral",
  withdrawn: "neutral",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <StatusBadge tone={TONE[status]}>{QUOTE_STATUS_LABEL[status]}</StatusBadge>;
}
