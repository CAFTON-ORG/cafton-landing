import { describe, expect, it } from "vitest";

import {
  APPROVAL_THRESHOLD_MINOR,
  approvalReasons,
  canEdit,
  canMove,
  checkAmounts,
  checkApprover,
  checkCreate,
  checkDealDelete,
  checkDelete,
  checkRespond,
  checkRevise,
  checkSend,
  checkValidity,
  checkWinAmount,
  checkWinQuotes,
  checkWithdraw,
  effectiveStatus,
  needsApproval,
  stageAfter,
  submitTarget,
} from "./core";

const today = "2026-10-22";

describe("workflow", () => {
  it("edits only drafts", () => {
    expect(canEdit("draft")).toBe(true);
    expect(canEdit("approved")).toBe(false);
    expect(canEdit("sent")).toBe(false);
  });

  it("only moves along the allowed paths", () => {
    expect(canMove("draft", "pending_approval")).toBe(true);
    expect(canMove("pending_approval", "sent")).toBe(false);
    expect(canMove("approved", "sent")).toBe(true);
    expect(canMove("sent", "accepted")).toBe(true);
    expect(canMove("sent", "withdrawn")).toBe(true);
    expect(canMove("draft", "withdrawn")).toBe(false);
    for (const done of ["accepted", "declined", "expired", "withdrawn", "superseded"] as const) {
      expect(canMove(done, "draft")).toBe(false);
      expect(canMove(done, "sent")).toBe(false);
    }
  });
});

describe("making a quote", () => {
  it("allows only open deals and one live quote at a time", () => {
    expect(checkCreate({ stageKind: "open" }, 0)).toBeNull();
    expect(checkCreate({ stageKind: "open" }, 1)).toMatch(/already has a quote in progress/);
    expect(checkCreate({ stageKind: "won" }, 0)).toMatch(/already won/);
    expect(checkCreate({ stageKind: "lost" }, 0)).toMatch(/Reopen/);
  });

  it("revises only the newest, unfinished-or-answered quote on an open deal", () => {
    expect(checkRevise("sent", "open", true)).toBeNull();
    expect(checkRevise("declined", "open", true)).toBeNull();
    expect(checkRevise("draft", "open", true)).toMatch(/Edit it directly/);
    expect(checkRevise("accepted", "open", true)).toMatch(/agreement/);
    expect(checkRevise("sent", "open", false)).toMatch(/newer version/);
    expect(checkRevise("sent", "lost", true)).toMatch(/closed/);
  });

  it("guards the figures and the end date", () => {
    expect(checkAmounts(1000, 50)).toBeNull();
    expect(checkAmounts(100_000_000_01, 50)).toMatch(/too large/);
    expect(checkAmounts(1000, 101)).toMatch(/0 to 100/);
    expect(checkValidity("2026-11-01", today)).toBeNull();
    expect(checkValidity(null, today)).toMatch(/Set a valid-until/);
    expect(checkValidity("2026-10-21", today)).toMatch(/passed/);
    expect(checkValidity("2027-02-01", today)).toMatch(/at most 90 days/);
  });
});

describe("approval", () => {
  it("is needed for a big total or a big discount, and says why", () => {
    expect(needsApproval({ totalMinor: APPROVAL_THRESHOLD_MINOR - 1, maxDiscountPct: 15 })).toBe(
      false,
    );
    expect(
      approvalReasons({ totalMinor: APPROVAL_THRESHOLD_MINOR, maxDiscountPct: 0 }),
    ).toHaveLength(1);
    expect(approvalReasons({ totalMinor: 1000, maxDiscountPct: 16 })[0]).toMatch(
      /discount above 15%/,
    );
    expect(
      approvalReasons({ totalMinor: APPROVAL_THRESHOLD_MINOR, maxDiscountPct: 50 }),
    ).toHaveLength(2);
    expect(submitTarget({ totalMinor: 1000, maxDiscountPct: 0 })).toBe("approved");
    expect(submitTarget({ totalMinor: 1000, maxDiscountPct: 30 })).toBe("pending_approval");
  });

  it("does not let you approve your own quote unless you are an Owner", () => {
    expect(checkApprover({ createdBy: "a", approverId: "a", roleKey: "admin" })).toMatch(
      /Someone else/,
    );
    expect(checkApprover({ createdBy: "a", approverId: "a", roleKey: "owner" })).toBeNull();
    expect(checkApprover({ createdBy: "a", approverId: "b", roleKey: "admin" })).toBeNull();
  });
});

describe("sending", () => {
  const ok = {
    status: "approved" as const,
    lineCount: 2,
    totalMinor: 5000,
    recipient: "a@b.co",
    validUntil: "2026-11-01",
    isNewest: true,
    dealKind: "open" as const,
    today,
  };

  it("is allowed once approved, with lines, a total, a recipient and a valid date", () => {
    expect(checkSend(ok)).toBeNull();
    expect(checkSend({ ...ok, status: "sent" })).toBeNull();
  });

  it("explains what is missing", () => {
    expect(checkSend({ ...ok, status: "draft" })).toMatch(/Submit/);
    expect(checkSend({ ...ok, status: "pending_approval" })).toMatch(/approval/);
    expect(checkSend({ ...ok, lineCount: 0 })).toMatch(/line/);
    expect(checkSend({ ...ok, totalMinor: 0 })).toMatch(/more than zero/);
    expect(checkSend({ ...ok, recipient: null })).toMatch(/email/);
    expect(checkSend({ ...ok, validUntil: "2026-10-01" })).toMatch(/passed/);
    expect(checkSend({ ...ok, isNewest: false })).toMatch(/newer version/);
    expect(checkSend({ ...ok, dealKind: "won" })).toMatch(/closed/);
  });
});

describe("replying and ending", () => {
  it("lets a sent, unexpired quote be answered once", () => {
    expect(checkRespond({ status: "sent", validUntil: "2026-10-22" }, today)).toBeNull();
    expect(checkRespond({ status: "sent", validUntil: "2026-10-21" }, today)).toMatch(/expired/);
    expect(checkRespond({ status: "accepted" }, today)).toMatch(/already accepted/);
    expect(checkRespond({ status: "withdrawn" }, today)).toMatch(/withdrawn/);
    expect(checkRespond({ status: "superseded" }, today)).toMatch(/newer version/);
    expect(checkRespond({ status: "draft" }, today)).toMatch(/not open/);
  });

  it("shows a sent quote past its date as expired", () => {
    expect(effectiveStatus({ status: "sent", validUntil: "2026-10-21" }, today)).toBe("expired");
    expect(effectiveStatus({ status: "accepted", validUntil: "2020-01-01" }, today)).toBe(
      "accepted",
    );
  });

  it("withdraws only open quotes that were more than a draft, with a reason", () => {
    expect(checkWithdraw("sent", "client went quiet")).toBeNull();
    expect(checkWithdraw("sent", " ")).toMatch(/why/);
    expect(checkWithdraw("draft", "x")).toMatch(/deleted/);
    expect(checkWithdraw("accepted", "x")).toMatch(/finished/);
  });

  it("deletes only drafts that were never sent", () => {
    expect(checkDelete("draft", false)).toBeNull();
    expect(checkDelete("draft", true)).toMatch(/sent once/);
    expect(checkDelete("sent", true)).toMatch(/Only a draft/);
  });
});

describe("effect on the deal", () => {
  const stages = [
    { id: "n", name: "New", kind: "open", position: 1 },
    { id: "p", name: "Proposal", kind: "open", position: 3 },
    { id: "g", name: "Negotiation", kind: "open", position: 4 },
    { id: "w", name: "Won", kind: "won", position: 5 },
  ];

  it("moves an early deal to Proposal on send, and on to Negotiation on accept, never backwards", () => {
    expect(stageAfter("send", stages[0], stages)?.id).toBe("p");
    expect(stageAfter("send", stages[1], stages)).toBeNull();
    expect(stageAfter("send", stages[2], stages)).toBeNull();
    expect(stageAfter("accept", stages[1], stages)?.id).toBe("g");
    expect(stageAfter("accept", stages[2], stages)).toBeNull();
    expect(stageAfter("accept", stages[3], stages)).toBeNull();
  });

  it("does nothing in a pipeline without those stages", () => {
    expect(
      stageAfter("send", { id: "a", name: "Intro", kind: "open", position: 1 }, [
        { id: "a", name: "Intro", kind: "open", position: 1 },
      ]),
    ).toBeNull();
  });

  it("keeps deals that were quoted, and wins them at the agreed total", () => {
    expect(checkDealDelete(["draft"])).toBeNull();
    expect(checkDealDelete(["draft", "sent"])).toMatch(/can't be deleted/);
    expect(checkWinAmount(null, 5)).toBeNull();
    expect(checkWinAmount(1000, 1000)).toBeNull();
    expect(checkWinAmount(1000, 999)).toMatch(/quoted total/);
  });
});

describe("checkWinQuotes", () => {
  it("lets a deal with no quotes, only drafts, or settled quotes be won", () => {
    expect(checkWinQuotes([])).toBeNull();
    expect(checkWinQuotes([{ reference: "QT-2026-0001", status: "draft" }])).toBeNull();
    expect(
      checkWinQuotes([
        { reference: "QT-2026-0001", status: "accepted" },
        { reference: "QT-2026-0002", status: "declined" },
        { reference: "QT-2026-0003", status: "withdrawn" },
        { reference: "QT-2026-0004", status: "superseded" },
        { reference: "QT-2026-0005", status: "expired" },
      ]),
    ).toBeNull();
  });

  it("refuses while an offer is out or waiting, and names the quote and why", () => {
    expect(checkWinQuotes([{ reference: "QT-2026-0007", status: "sent" }])).toMatch(
      /QT-2026-0007 is out with the client/,
    );
    expect(checkWinQuotes([{ reference: "QT-2026-0008", status: "pending_approval" }])).toMatch(
      /waiting for approval/,
    );
    expect(checkWinQuotes([{ reference: "QT-2026-0009", status: "approved" }])).toMatch(
      /approved but not sent/,
    );
  });
});
