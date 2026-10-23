import type { QuoteView } from "./types";

export type HistoryKind =
  | "started"
  | "approved"
  | "sent"
  | "opened"
  | "accepted"
  | "declined"
  | "withdrawn"
  | "expired"
  | "waiting";

export type HistoryTone = "neutral" | "success" | "danger" | "warning";

export interface HistoryEvent {
  kind: HistoryKind;
  title: string;
  /** Who, to whom, or why. */
  detail?: string;
  /** ISO moment or yyyy-mm-dd. */
  at?: string;
  /** Whether `at` carries a time of day (false for a plain calendar date). */
  hasTime: boolean;
  tone: HistoryTone;
  /** A step that has not happened yet: drawn muted, always last. */
  upcoming?: boolean;
}

type HistorySource = Pick<
  QuoteView,
  | "status"
  | "createdAt"
  | "createdByName"
  | "approvedAt"
  | "approvedByName"
  | "sentAt"
  | "sentTo"
  | "viewedAt"
  | "acceptedAt"
  | "acceptedByName"
  | "declinedAt"
  | "declinedReason"
  | "withdrawnAt"
  | "withdrawnReason"
  | "validUntil"
>;

const moment = (value: string | undefined) => (value ? new Date(value).getTime() : 0);

/**
 * What happened to a quote, oldest first, built from the dates the quote already carries. A quote
 * that is still open ends with a muted "what is next" step. Pure, so the rules are testable.
 */
export function quoteHistory(quote: HistorySource): HistoryEvent[] {
  const events: HistoryEvent[] = [
    {
      kind: "started",
      title: "Started",
      detail: quote.createdByName ? `By ${quote.createdByName}` : undefined,
      at: quote.createdAt,
      hasTime: true,
      tone: "neutral",
    },
  ];

  if (quote.approvedAt) {
    events.push({
      kind: "approved",
      title: "Approved",
      detail: quote.approvedByName ? `By ${quote.approvedByName}` : "Under the approval limit",
      at: quote.approvedAt,
      hasTime: true,
      tone: "neutral",
    });
  }
  if (quote.sentAt) {
    events.push({
      kind: "sent",
      title: "Sent",
      detail: quote.sentTo ? `To ${quote.sentTo}` : undefined,
      at: quote.sentAt,
      hasTime: true,
      tone: "neutral",
    });
  }
  if (quote.viewedAt) {
    events.push({
      kind: "opened",
      title: "Opened by the client",
      at: quote.viewedAt,
      hasTime: true,
      tone: "neutral",
    });
  }
  if (quote.acceptedAt) {
    events.push({
      kind: "accepted",
      title: "Accepted",
      detail: quote.acceptedByName ? `By ${quote.acceptedByName}` : undefined,
      at: quote.acceptedAt,
      hasTime: true,
      tone: "success",
    });
  }
  if (quote.declinedAt) {
    events.push({
      kind: "declined",
      title: "Declined",
      detail: quote.declinedReason || undefined,
      at: quote.declinedAt,
      hasTime: true,
      tone: "danger",
    });
  }
  if (quote.withdrawnAt) {
    events.push({
      kind: "withdrawn",
      title: "Withdrawn",
      detail: quote.withdrawnReason || undefined,
      at: quote.withdrawnAt,
      hasTime: true,
      tone: "danger",
    });
  }
  if (quote.status === "expired" && quote.validUntil) {
    events.push({
      kind: "expired",
      title: "Expired",
      detail: "It was not accepted in time",
      at: quote.validUntil,
      hasTime: false,
      tone: "warning",
    });
  }

  events.sort((a, b) => moment(a.at) - moment(b.at));

  if (quote.status === "sent") {
    events.push({
      kind: "waiting",
      title: "Waiting for the client",
      detail: quote.validUntil ? "Open until" : undefined,
      at: quote.validUntil,
      hasTime: false,
      tone: "neutral",
      upcoming: true,
    });
  }
  return events;
}
