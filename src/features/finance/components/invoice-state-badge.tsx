import { StatusBadge, type StatusTone } from "@/components/dashboard/shared/status-badge";
import { INVOICE_STATE_LABEL, type InvoiceState } from "../rules/invoicing";

const TONE: Record<InvoiceState, StatusTone> = {
  draft: "neutral",
  void: "neutral",
  open: "info",
  partial: "warning",
  overdue: "danger",
  paid: "success",
};

export function InvoiceStateBadge({ state }: { state: InvoiceState }) {
  return <StatusBadge tone={TONE[state]}>{INVOICE_STATE_LABEL[state]}</StatusBadge>;
}
