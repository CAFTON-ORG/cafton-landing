import { describe, expect, it } from "vitest";

import {
  APPROVAL_THRESHOLD_MINOR,
  canEdit,
  canMove,
  checkRespond,
  checkSend,
  effectiveStatus,
  needsApproval,
  submitTarget,
} from "./rules";

const today = "2026-10-22";

describe("quote workflow", () => {
  it("edits only drafts", () => {
    expect(canEdit("draft")).toBe(true);
    expect(canEdit("approved")).toBe(false);
    expect(canEdit("sent")).toBe(false);
  });

  it("asks for approval only at or above the threshold", () => {
    expect(needsApproval(APPROVAL_THRESHOLD_MINOR - 1)).toBe(false);
    expect(needsApproval(APPROVAL_THRESHOLD_MINOR)).toBe(true);
    expect(submitTarget(1000)).toBe("approved");
    expect(submitTarget(APPROVAL_THRESHOLD_MINOR)).toBe("pending_approval");
  });

  it("only moves along the allowed paths", () => {
    expect(canMove("draft", "pending_approval")).toBe(true);
    expect(canMove("pending_approval", "sent")).toBe(false);
    expect(canMove("approved", "sent")).toBe(true);
    expect(canMove("sent", "accepted")).toBe(true);
    expect(canMove("accepted", "declined")).toBe(false);
    expect(canMove("declined", "draft")).toBe(false);
  });
});

describe("sending", () => {
  const ok = {
    status: "approved" as const,
    lineCount: 2,
    totalMinor: 5000,
    recipient: "a@b.co",
    validUntil: "2026-11-01",
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
  });
});

describe("replying", () => {
  it("lets a sent, unexpired quote be answered once", () => {
    expect(checkRespond({ status: "sent", validUntil: "2026-10-22" }, today)).toBeNull();
    expect(checkRespond({ status: "sent", validUntil: "2026-10-21" }, today)).toMatch(/expired/);
    expect(checkRespond({ status: "accepted" }, today)).toMatch(/already accepted/);
    expect(checkRespond({ status: "superseded" }, today)).toMatch(/newer version/);
    expect(checkRespond({ status: "draft" }, today)).toMatch(/not open/);
  });

  it("shows a sent quote past its date as expired", () => {
    expect(effectiveStatus({ status: "sent", validUntil: "2026-10-21" }, today)).toBe("expired");
    expect(effectiveStatus({ status: "sent", validUntil: "2026-10-22" }, today)).toBe("sent");
    expect(effectiveStatus({ status: "accepted", validUntil: "2020-01-01" }, today)).toBe(
      "accepted",
    );
  });
});
