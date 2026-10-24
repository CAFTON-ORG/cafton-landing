import { describe, expect, it } from "vitest";

import {
  billBalance,
  billStateOf,
  billTotal,
  checkApproveBill,
  checkBillDraft,
  checkBillPayment,
  checkVendor,
  checkVoidBill,
} from "./payables";

const line = { description: "Hosting", accountId: "acc", amountMinor: 100_000 };

describe("vendors", () => {
  it("needs a name, a sensible email and terms", () => {
    expect(checkVendor({ name: "Acme", termsDays: 15 })).toBeNull();
    expect(checkVendor({ name: "  ", termsDays: 15 })?.name).toBeTruthy();
    expect(checkVendor({ name: "Acme", email: "nope", termsDays: 15 })?.email).toBeTruthy();
    expect(checkVendor({ name: "Acme", termsDays: 400 })?.terms).toBeTruthy();
  });
});

describe("bill drafts", () => {
  const ok = { vendorId: "v", billDate: "2026-10-01", dueDate: "2026-10-16", lines: [line] };
  it("accepts a complete draft", () => expect(checkBillDraft(ok)).toBeNull());
  it("asks for the supplier and real dates", () => {
    expect(checkBillDraft({ ...ok, vendorId: null })?.vendor).toBeTruthy();
    expect(checkBillDraft({ ...ok, billDate: "2026-02-30" })?.billDate).toBeTruthy();
    expect(checkBillDraft({ ...ok, dueDate: "2026-09-01" })?.dueDate).toBeTruthy();
  });
  it("explains each bad line by position", () => {
    const errors = checkBillDraft({
      ...ok,
      lines: [
        line,
        { ...line, description: "" },
        { ...line, accountId: "" },
        { ...line, amountMinor: 0 },
      ],
    });
    expect(Object.keys(errors?.lines ?? {})).toEqual(["1", "2", "3"]);
  });
  it("adds the lines up", () => expect(billTotal([line, line])).toBe(200_000));
});

describe("approving a bill", () => {
  const ok = {
    status: "draft" as const,
    vendorActive: true,
    lineCount: 1,
    totalMinor: 100,
    billDate: "2026-10-01",
    today: "2026-10-23",
  };
  it("passes a complete draft", () => expect(checkApproveBill(ok)).toBeNull());
  it("refuses what is not ready", () => {
    expect(checkApproveBill({ ...ok, status: "approved" })).toMatch(/draft/);
    expect(checkApproveBill({ ...ok, vendorActive: false })).toMatch(/archived/);
    expect(checkApproveBill({ ...ok, lineCount: 0 })).toMatch(/line/);
    expect(checkApproveBill({ ...ok, totalMinor: 0 })).toMatch(/zero/);
    expect(checkApproveBill({ ...ok, billDate: "2026-12-30" })).toMatch(/ahead/);
  });
});

describe("where a bill stands", () => {
  const bill = {
    status: "approved" as const,
    totalMinor: 1000,
    paidMinor: 0,
    dueDate: "2026-11-01",
  };
  it("derives the state from payments and the due date", () => {
    expect(billStateOf({ ...bill, status: "draft" }, "2026-10-23")).toBe("draft");
    expect(billStateOf({ ...bill, status: "void" }, "2026-10-23")).toBe("void");
    expect(billStateOf(bill, "2026-10-23")).toBe("open");
    expect(billStateOf({ ...bill, paidMinor: 400 }, "2026-10-23")).toBe("partial");
    expect(billStateOf(bill, "2026-11-02")).toBe("overdue");
    expect(billStateOf({ ...bill, paidMinor: 1000 }, "2026-11-02")).toBe("paid");
    expect(billBalance({ totalMinor: 1000, paidMinor: 250 })).toBe(750);
  });
});

describe("paying a bill", () => {
  const ok = {
    billStatus: "approved" as const,
    balanceMinor: 100_000,
    amountMinor: 90_000,
    whtMinor: 10_000,
    paidDate: "2026-10-23",
    today: "2026-10-23",
  };
  it("lets cash and withheld tax together settle it", () =>
    expect(checkBillPayment(ok)).toBeNull());
  it("refuses an overpayment, a future date and a bill that is not approved", () => {
    expect(checkBillPayment({ ...ok, amountMinor: 100_000 })?.form).toMatch(/more than/);
    expect(checkBillPayment({ ...ok, paidDate: "2026-10-24" })?.date).toBeTruthy();
    expect(checkBillPayment({ ...ok, billStatus: "draft" })?.form).toMatch(/approved/);
    expect(checkBillPayment({ ...ok, amountMinor: 0 })?.amount).toBeTruthy();
  });
});

describe("voiding a bill", () => {
  it("needs an approved, unpaid bill and a reason", () => {
    expect(checkVoidBill({ status: "approved", paidMinor: 0, reason: "Duplicate" })).toBeNull();
    expect(checkVoidBill({ status: "approved", paidMinor: 5, reason: "x" })).toMatch(/Void them/);
    expect(checkVoidBill({ status: "approved", paidMinor: 0, reason: " " })).toMatch(/why/);
    expect(checkVoidBill({ status: "void", paidMinor: 0, reason: "x" })).toMatch(/already/);
    expect(checkVoidBill({ status: "draft", paidMinor: 0, reason: "x" })).toMatch(/deleted/);
  });
});
