/**
 * The business rules of quotes, in one place. Pure: shared by the actions, the screens and the
 * database-facing code, and unit tested. Every restriction a person can run into is written here
 * with the message they will read.
 *
 * Lifecycle:
 *   draft -> (pending_approval) -> approved -> sent -> accepted | declined | expired
 *   Any open quote can also be withdrawn, or replaced by a newer version.
 *   accepted, declined, expired, withdrawn and superseded are final.
 * A sent quote's wording and money never change; to change them, make a new version.
 */

export const QUOTE_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "sent",
  "accepted",
  "declined",
  "expired",
  "withdrawn",
  "superseded",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Draft",
  pending_approval: "Waiting for approval",
  approved: "Approved",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  withdrawn: "Withdrawn",
  superseded: "Replaced by a newer version",
};

/* ----------------------------------------------------------------- limits */

/** Philippine VAT. Frozen on each quote when it is made, so a later change never rewrites an old quote. */
export const DEFAULT_TAX_RATE_PCT = 12;
/** A quote at or above this total (P250,000.00 in centavos) needs a second person's approval before it is sent. */
export const APPROVAL_THRESHOLD_MINOR = 250_000_00;
/** A discount above this percent on any line needs approval, however small the quote. */
export const MAX_DISCOUNT_PCT_WITHOUT_APPROVAL = 15;
/** Days a new quote stays valid. */
export const DEFAULT_VALID_DAYS = 30;
/** The longest a quote may stay open: prices and availability change. */
export const MAX_VALID_DAYS = 90;
/** The largest total a quote may have (P100,000,000.00): a typo guard. */
export const MAX_TOTAL_MINOR = 100_000_000_00;
export const DEFAULT_DEPOSIT_PCT = 50;

/* --------------------------------------------------------------- statuses */

/** Only a draft can be edited. To change anything after that, make a new version. */
export const canEdit = (status: QuoteStatus) => status === "draft";

/** The ones still in play for the deal: not final. */
export const isLive = (status: QuoteStatus) =>
  status === "draft" || status === "pending_approval" || status === "approved" || status === "sent";

export const LIVE_STATUSES: readonly QuoteStatus[] = QUOTE_STATUSES.filter(isLive);

const NEXT: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: ["pending_approval", "approved", "superseded"],
  pending_approval: ["approved", "draft", "superseded", "withdrawn"],
  approved: ["sent", "draft", "superseded", "withdrawn"],
  sent: ["accepted", "declined", "expired", "superseded", "withdrawn"],
  accepted: [],
  declined: [],
  expired: [],
  withdrawn: [],
  superseded: [],
};

export const canMove = (from: QuoteStatus, to: QuoteStatus) => NEXT[from].includes(to);

/* ----------------------------------------------------------------- making */

/**
 * One offer at a time: a deal has at most one live quote. To change it, make a new version (the
 * old one is replaced); to start over, withdraw it first. Won and lost deals take no new quotes.
 */
export function checkCreate(
  deal: { stageKind: "open" | "won" | "lost" },
  liveQuotes: number,
): string | null {
  if (deal.stageKind === "won") return "This deal is already won, so it can't take a new quote.";
  if (deal.stageKind === "lost") return "This deal is lost. Reopen it to make a quote.";
  if (liveQuotes > 0) {
    return "This deal already has a quote in progress. Open it and make a new version, or withdraw it first.";
  }
  return null;
}

export function checkRevise(
  status: QuoteStatus,
  dealKind: "open" | "won" | "lost",
  isNewest: boolean,
): string | null {
  if (dealKind !== "open") return "The deal is closed, so its quotes can't be revised.";
  if (!isNewest || status === "superseded") return "A newer version already replaced this one.";
  if (status === "draft") return "This is still a draft. Edit it directly.";
  if (status === "accepted") {
    return "An accepted quote is the agreement and can't be revised. Make a new quote on the deal for a change.";
  }
  return null;
}

/** Why the figures can't be saved, or null. */
export function checkAmounts(totalMinor: number, depositPct: number): string | null {
  if (totalMinor > MAX_TOTAL_MINOR)
    return "That total is too large. Check the prices and quantities.";
  if (depositPct < 0 || depositPct > 100) return "The deposit is a percentage from 0 to 100.";
  return null;
}

const dayDiff = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** A quote needs an end date: not in the past, and not more than 90 days away. */
export function checkValidity(validUntil: string | null | undefined, today: string): string | null {
  if (!validUntil) return "Set a valid-until date so the offer doesn't stay open forever.";
  if (validUntil < today) return "The valid-until date has passed.";
  if (dayDiff(today, validUntil) > MAX_VALID_DAYS) {
    return `An offer can stay open for at most ${MAX_VALID_DAYS} days. Pick an earlier date.`;
  }
  return null;
}

/* --------------------------------------------------------------- approval */

/** Why this quote needs a second person to approve it (empty when it does not). */
export function approvalReasons(quote: { totalMinor: number; maxDiscountPct: number }): string[] {
  const reasons: string[] = [];
  if (quote.totalMinor >= APPROVAL_THRESHOLD_MINOR) {
    reasons.push(
      `The total is at or above P${(APPROVAL_THRESHOLD_MINOR / 100).toLocaleString("en-PH")}.`,
    );
  }
  if (quote.maxDiscountPct > MAX_DISCOUNT_PCT_WITHOUT_APPROVAL) {
    reasons.push(`A line has a discount above ${MAX_DISCOUNT_PCT_WITHOUT_APPROVAL}%.`);
  }
  return reasons;
}

export const needsApproval = (quote: { totalMinor: number; maxDiscountPct: number }) =>
  approvalReasons(quote).length > 0;

/** What "Submit" does: straight to approved when nothing needs a second look, otherwise ask. */
export const submitTarget = (quote: { totalMinor: number; maxDiscountPct: number }): QuoteStatus =>
  needsApproval(quote) ? "pending_approval" : "approved";

/** You can't approve what you wrote, unless you are an Owner (so a one-person team is never stuck). */
export function checkApprover(options: {
  createdBy?: string | null;
  approverId: string | null;
  roleKey: string;
}) {
  if (
    options.createdBy &&
    options.createdBy === options.approverId &&
    options.roleKey !== "owner"
  ) {
    return "Someone else has to approve a quote you wrote.";
  }
  return null;
}

/* ---------------------------------------------------------------- sending */

export interface SendCheck {
  status: QuoteStatus;
  lineCount: number;
  totalMinor: number;
  recipient?: string | null;
  validUntil?: string | null;
  isNewest: boolean;
  dealKind: "open" | "won" | "lost";
  /** "YYYY-MM-DD", today in the Philippines. */
  today: string;
}

/** Why a quote cannot be sent yet, or null when it can. */
export function checkSend(quote: SendCheck): string | null {
  if (quote.dealKind !== "open") return "The deal is closed, so this quote can't be sent.";
  if (!quote.isNewest) return "A newer version exists. Send that one.";
  if (quote.status !== "approved" && quote.status !== "sent") {
    return quote.status === "pending_approval"
      ? "It is waiting for approval."
      : "Submit the quote first.";
  }
  if (quote.lineCount === 0) return "Add at least one line.";
  if (quote.totalMinor <= 0) return "The total must be more than zero.";
  if (!quote.recipient) return "The contact has no email address.";
  return checkValidity(quote.validUntil, quote.today);
}

/** Why an accept or decline cannot happen, or null when it can. `today` is "YYYY-MM-DD". */
export function checkRespond(
  quote: { status: QuoteStatus; validUntil?: string | null },
  today: string,
): string | null {
  switch (quote.status) {
    case "sent":
      return quote.validUntil && quote.validUntil < today
        ? "This quote has expired. Ask us for an updated one."
        : null;
    case "accepted":
      return "This quote was already accepted.";
    case "declined":
      return "This quote was declined.";
    case "expired":
      return "This quote has expired. Ask us for an updated one.";
    case "withdrawn":
      return "This quote was withdrawn. Ask us if you would still like an offer.";
    case "superseded":
      return "A newer version of this quote replaced it. Please use the latest one we sent you.";
    default:
      return "This quote is not open for a reply.";
  }
}

/** The status a sent quote should show, given today (a sent quote past its date is expired). */
export function effectiveStatus(
  quote: { status: QuoteStatus; validUntil?: string | null },
  today: string,
): QuoteStatus {
  return quote.status === "sent" && quote.validUntil && quote.validUntil < today
    ? "expired"
    : quote.status;
}

/** Only an open quote can be withdrawn, and a reason is kept. */
export function checkWithdraw(status: QuoteStatus, reason: string): string | null {
  if (!canMove(status, "withdrawn")) {
    return status === "draft"
      ? "A draft that was never sent can simply be deleted."
      : "This quote is finished and can't be withdrawn.";
  }
  return reason.trim() ? null : "Say why it is being withdrawn.";
}

/** A draft that was never approved or sent can be deleted; anything else is a record. */
export function checkDelete(status: QuoteStatus, everSent: boolean): string | null {
  if (status !== "draft") return "Only a draft can be deleted. Anything sent is kept as a record.";
  if (everSent) return "This quote was sent once, so it can't be deleted.";
  return null;
}

/* ------------------------------------------------------ effect on the deal */

/** Finds the stage of an open pipeline that is called one of `names`, case-insensitively. */
export function stageNamed<S extends { id: string; name: string; kind: string; position: number }>(
  stages: readonly S[],
  names: readonly string[],
): S | undefined {
  return stages.find((stage) => stage.kind === "open" && names.includes(stage.name.toLowerCase()));
}

/**
 * Sending a quote moves a deal that is earlier in the pipeline to its "Proposal" stage; one already
 * at or past it stays where it is. Accepting moves it on to "Negotiation" the same way.
 */
export function stageAfter<S extends { id: string; name: string; kind: string; position: number }>(
  event: "send" | "accept",
  current: S,
  stages: readonly S[],
): S | null {
  if (current.kind !== "open") return null;
  const target = stageNamed(stages, event === "send" ? ["proposal"] : ["negotiation"]);
  return target && target.position > current.position ? target : null;
}

/** A deal with a quote that was ever sent can't be deleted: the quote is a record of what was offered. */
export function checkDealDelete(quoteStatuses: readonly QuoteStatus[]): string | null {
  return quoteStatuses.some((status) => status !== "draft")
    ? "This deal has quotes that were sent, so it can't be deleted."
    : null;
}

/**
 * Winning a deal that has an accepted quote: the value is what the client agreed to, so a different
 * figure is refused. (A deal with no accepted quote can be won at any value.)
 */
export function checkWinAmount(
  acceptedTotalMinor: number | null,
  amountMinor: number | null,
): string | null {
  if (acceptedTotalMinor === null) return null;
  return amountMinor === acceptedTotalMinor
    ? null
    : "This deal has an accepted quote, so it is won at the quoted total.";
}
