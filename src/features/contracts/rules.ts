/**
 * The rules for contracts and statements of work, in one place so the screens, the server actions
 * and the tests all agree. Pure: no database. Dates are "YYYY-MM-DD" in Manila time.
 */

export const CONTRACT_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "Draft",
  sent: "Waiting for signature",
  accepted: "Signed",
  declined: "Declined",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

export const CONTRACT_KINDS = ["contract", "sow"] as const;
export type ContractKind = (typeof CONTRACT_KINDS)[number];
export const CONTRACT_KIND_LABEL: Record<ContractKind, string> = {
  contract: "Service agreement",
  sow: "Statement of work",
};

export const DEFAULT_VALID_DAYS = 30;
export const MAX_VALID_DAYS = 180;
export const MAX_BODY_LENGTH = 60_000;

export const canEdit = (status: ContractStatus) => status === "draft";
/** In play: being written, or out with the client. */
export const LIVE_STATUSES: readonly ContractStatus[] = ["draft", "sent"];

const dayDiff = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** The end date is required, not in the past, and not more than 180 days away. */
export function checkValidity(validUntil: string | null | undefined, today: string): string | null {
  if (!validUntil) return "Set a sign-by date so the offer doesn't stay open forever.";
  if (validUntil < today) return "The sign-by date has passed.";
  if (dayDiff(today, validUntil) > MAX_VALID_DAYS) {
    return `A contract can stay open for at most ${MAX_VALID_DAYS} days. Pick an earlier date.`;
  }
  return null;
}

/** Whether a new contract may be drafted for this deal. */
export function checkCreate(facts: {
  dealKind: "open" | "won" | "lost";
  kind: ContractKind;
  /** The quote chosen, if any, and whether it was accepted. */
  quote: { accepted: boolean } | null;
  templateNeedsQuote: boolean;
  liveOfSameKind: number;
}): string | null {
  if (facts.dealKind === "lost") return "This deal was lost, so it can't have a new contract.";
  if (facts.liveOfSameKind > 0) {
    return `This deal already has a ${CONTRACT_KIND_LABEL[facts.kind].toLowerCase()} in progress. Finish or withdraw it first.`;
  }
  if (facts.kind === "sow" && !facts.quote?.accepted) {
    return "A statement of work follows an accepted quote. Pick the accepted quote first.";
  }
  if (facts.templateNeedsQuote && !facts.quote) {
    return "This template uses quote details. Pick the quote it is for.";
  }
  if (facts.quote && !facts.quote.accepted) {
    return "Contracts are made from an accepted quote, so the price is agreed first.";
  }
  return null;
}

export function checkSend(facts: {
  status: ContractStatus;
  body: string;
  recipient: string | null;
  validUntil: string | null;
  today: string;
  dealKind: "open" | "won" | "lost";
}): string | null {
  if (facts.status !== "draft") return "Only a draft can be sent.";
  if (facts.dealKind === "lost") return "This deal was lost, so nothing more can be sent.";
  if (!facts.body.trim()) return "The contract has no wording yet.";
  if (!facts.recipient) return "The contact has no email address, so there is nowhere to send it.";
  return checkValidity(facts.validUntil, facts.today);
}

export function checkRespond(
  contract: { status: ContractStatus; validUntil?: string | null },
  today: string,
): string | null {
  switch (contract.status) {
    case "sent":
      return contract.validUntil && contract.validUntil < today
        ? "This contract has expired. Ask us for an updated one."
        : null;
    case "accepted":
      return "This contract was already signed.";
    case "declined":
      return "This contract was declined.";
    case "expired":
      return "This contract has expired. Ask us for an updated one.";
    case "withdrawn":
      return "This contract was withdrawn. Contact us if you would still like to go ahead.";
    default:
      return "This contract is not open for a reply.";
  }
}

/** What to show: a sent contract past its date reads as expired even before the daily job runs. */
export function effectiveStatus(
  contract: { status: ContractStatus; validUntil?: string | null },
  today: string,
): ContractStatus {
  return contract.status === "sent" && contract.validUntil && contract.validUntil < today
    ? "expired"
    : contract.status;
}

export function checkWithdraw(status: ContractStatus, reason: string): string | null {
  if (status !== "sent") {
    return status === "draft"
      ? "A draft was never sent. Delete it instead."
      : "Only a contract waiting for a signature can be withdrawn.";
  }
  return reason.trim() ? null : "Say why it is being withdrawn.";
}

/** Only a draft that was never sent can be deleted. Everything else is a record. */
export function checkDelete(status: ContractStatus, everSent: boolean): string | null {
  if (status === "draft" && !everSent) return null;
  return "Only a draft that was never sent can be deleted. Withdraw it instead.";
}

/** A deal with a sent, signed or withdrawn contract is part of the record and can't be deleted. */
export function checkDealDelete(statuses: readonly ContractStatus[]): string | null {
  return statuses.some((status) => status !== "draft")
    ? "This deal has contracts that were sent, so it can't be deleted. Mark it lost instead."
    : null;
}
