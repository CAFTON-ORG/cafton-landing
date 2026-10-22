import { StatusBadge, type StatusTone } from "@/components/dashboard/shared/status-badge";
import { CONTRACT_STATUS_LABEL, type ContractStatus } from "../rules";

const TONE: Record<ContractStatus, StatusTone> = {
  draft: "neutral",
  sent: "info",
  accepted: "success",
  declined: "danger",
  withdrawn: "neutral",
  expired: "neutral",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <StatusBadge tone={TONE[status]}>{CONTRACT_STATUS_LABEL[status]}</StatusBadge>;
}
