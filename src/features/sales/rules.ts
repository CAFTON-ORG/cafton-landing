/** Rules for quotes. Pure: shared by the actions and the screens, and unit tested. */

export const QUOTE_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "sent",
  "accepted",
  "declined",
  "expired",
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
  superseded: "Replaced by a newer version",
};

/** Philippine VAT. Frozen on each quote when it is made, so a later change never rewrites an old quote. */
export const DEFAULT_TAX_RATE_PCT = 12;
/** A quote at or above this total (P250,000.00 in centavos) needs a second person to approve it before it is sent. */
export const APPROVAL_THRESHOLD_MINOR = 250_000_00;
/** Days a new quote stays valid. */
export const DEFAULT_VALID_DAYS = 30;

/** Only a draft can be edited. To change anything after that, make a new version. */
export const canEdit = (status: QuoteStatus) => status === "draft";

/** The ones still in play for the deal: not replaced, declined or expired. */
export const isLive = (status: QuoteStatus) =>
  status === "draft" || status === "pending_approval" || status === "approved" || status === "sent";

export const needsApproval = (totalMinor: number) => totalMinor >= APPROVAL_THRESHOLD_MINOR;

const NEXT: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: ["pending_approval", "approved", "superseded"],
  pending_approval: ["approved", "draft", "superseded"],
  approved: ["sent", "draft", "superseded"],
  sent: ["accepted", "declined", "expired", "superseded"],
  accepted: [],
  declined: [],
  expired: [],
  superseded: [],
};

export const canMove = (from: QuoteStatus, to: QuoteStatus) => NEXT[from].includes(to);

/** What "Submit" does: straight to approved when the total is small, otherwise ask for approval. */
export const submitTarget = (totalMinor: number): QuoteStatus =>
  needsApproval(totalMinor) ? "pending_approval" : "approved";

export interface SendCheck {
  status: QuoteStatus;
  lineCount: number;
  totalMinor: number;
  recipient?: string | null;
  validUntil?: string | null;
  /** "YYYY-MM-DD", today in the Philippines. */
  today: string;
}

/** Why a quote cannot be sent yet, or null when it can. */
export function checkSend(quote: SendCheck): string | null {
  if (quote.status !== "approved" && quote.status !== "sent") {
    return quote.status === "pending_approval"
      ? "It is waiting for approval."
      : "Submit the quote first.";
  }
  if (quote.lineCount === 0) return "Add at least one line.";
  if (quote.totalMinor <= 0) return "The total must be more than zero.";
  if (!quote.recipient) return "The contact has no email address.";
  if (quote.validUntil && quote.validUntil < quote.today) {
    return "The validity date has passed. Make a new version.";
  }
  return null;
}

/** Why an accept or decline cannot happen, or null when it can. `today` is "YYYY-MM-DD". */
export function checkRespond(
  quote: { status: QuoteStatus; validUntil?: string | null },
  today: string,
): string | null {
  if (quote.status === "accepted") return "This quote was already accepted.";
  if (quote.status === "declined") return "This quote was declined.";
  if (quote.status === "superseded") return "A newer version of this quote replaced it.";
  if (quote.status !== "sent") return "This quote is not open for a reply.";
  if (quote.validUntil && quote.validUntil < today) return "This quote has expired.";
  return null;
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
