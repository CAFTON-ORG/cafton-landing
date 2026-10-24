import { describe, expect, it } from "vitest";

import { EMPTY_TOTAL, accountingText, addTo, dueHint, signOf } from "./display";

describe("when something is due", () => {
  const today = "2026-10-23";
  it("counts down, and warns in the last week", () => {
    expect(dueHint("2026-11-22", today, true)).toEqual({ text: "Due in 30 days", tone: "neutral" });
    expect(dueHint("2026-10-30", today, true)).toEqual({ text: "Due in 7 days", tone: "warning" });
    expect(dueHint("2026-10-24", today, true)).toEqual({ text: "Due in 1 day", tone: "warning" });
  });
  it("says today, and how late it is", () => {
    expect(dueHint("2026-10-23", today, true)).toEqual({ text: "Due today", tone: "warning" });
    expect(dueHint("2026-10-22", today, true)).toEqual({ text: "1 day overdue", tone: "danger" });
    expect(dueHint("2026-10-01", today, true)).toEqual({ text: "22 days overdue", tone: "danger" });
  });
  it("says nothing once there is nothing to pay", () => {
    expect(dueHint("2026-10-01", today, false)).toBeNull();
  });
});

describe("amounts", () => {
  it("has a sign", () => {
    expect([signOf(5), signOf(-5), signOf(0)]).toEqual(["positive", "negative", "zero"]);
  });
  it("shows a negative in parentheses, the way accountants write it", () => {
    expect(accountingText("₱1,000.00", -100_000)).toBe("(₱1,000.00)");
    expect(accountingText("₱1,000.00", 100_000)).toBe("₱1,000.00");
    expect(accountingText("₱0.00", 0)).toBe("₱0.00");
  });
  it("adds up a state's total", () => {
    expect(addTo(addTo(EMPTY_TOTAL, 500), 250)).toEqual({ count: 2, amountMinor: 750 });
  });
});
