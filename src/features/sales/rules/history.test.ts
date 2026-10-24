import { describe, expect, it } from "vitest";

import { quoteHistory } from "./history";

const base = {
  status: "draft" as const,
  createdAt: "2026-10-01T02:00:00.000Z",
  createdByName: "Olivia Owner",
};

describe("quoteHistory", () => {
  it("starts with who made it, and nothing else for a fresh draft", () => {
    const events = quoteHistory(base);
    expect(events.map((e) => e.kind)).toEqual(["started"]);
    expect(events[0].detail).toBe("By Olivia Owner");
  });

  it("lists what happened oldest first", () => {
    const events = quoteHistory({
      ...base,
      status: "accepted",
      approvedAt: "2026-10-02T02:00:00.000Z",
      sentAt: "2026-10-03T02:00:00.000Z",
      sentTo: "client@example.com",
      viewedAt: "2026-10-04T02:00:00.000Z",
      acceptedAt: "2026-10-05T02:00:00.000Z",
      acceptedByName: "Maria Santos",
    });
    expect(events.map((e) => e.kind)).toEqual([
      "started",
      "approved",
      "sent",
      "opened",
      "accepted",
    ]);
    expect(events.find((e) => e.kind === "sent")?.detail).toBe("To client@example.com");
    expect(events.find((e) => e.kind === "accepted")?.tone).toBe("success");
  });

  it("says when an approval needed no second person", () => {
    const events = quoteHistory({ ...base, approvedAt: "2026-10-02T02:00:00.000Z" });
    expect(events.find((e) => e.kind === "approved")?.detail).toBe("Under the approval limit");
  });

  it("keeps the reason of a decline or withdrawal", () => {
    const declined = quoteHistory({
      ...base,
      status: "declined",
      sentAt: "2026-10-03T02:00:00.000Z",
      declinedAt: "2026-10-04T02:00:00.000Z",
      declinedReason: "Budget",
    });
    expect(declined.at(-1)).toMatchObject({ kind: "declined", detail: "Budget", tone: "danger" });

    const withdrawn = quoteHistory({
      ...base,
      status: "withdrawn",
      sentAt: "2026-10-03T02:00:00.000Z",
      withdrawnAt: "2026-10-04T02:00:00.000Z",
      withdrawnReason: "Scope changed",
    });
    expect(withdrawn.at(-1)).toMatchObject({ kind: "withdrawn", detail: "Scope changed" });
  });

  it("shows an expired quote on the day it lapsed, as a plain date", () => {
    const events = quoteHistory({
      ...base,
      status: "expired",
      sentAt: "2026-10-03T02:00:00.000Z",
      validUntil: "2026-10-20",
    });
    expect(events.at(-1)).toMatchObject({ kind: "expired", at: "2026-10-20", hasTime: false });
  });

  it("ends an open sent quote with a muted step for what comes next", () => {
    const events = quoteHistory({
      ...base,
      status: "sent",
      sentAt: "2026-10-03T02:00:00.000Z",
      validUntil: "2026-11-02",
    });
    expect(events.at(-1)).toMatchObject({ kind: "waiting", upcoming: true, at: "2026-11-02" });
    expect(events.filter((e) => e.upcoming)).toHaveLength(1);
  });

  it("has no next step once the quote is closed", () => {
    const events = quoteHistory({
      ...base,
      status: "accepted",
      sentAt: "2026-10-03T02:00:00.000Z",
      acceptedAt: "2026-10-05T02:00:00.000Z",
    });
    expect(events.some((e) => e.upcoming)).toBe(false);
  });
});
