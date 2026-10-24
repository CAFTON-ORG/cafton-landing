import { describe, expect, it } from "vitest";

import {
  RECEIPT_REQUIRED_OVER_MINOR,
  checkApproveExpense,
  checkEditExpense,
  checkExpense,
  checkReceiptUpload,
  checkRejectExpense,
  checkVoidExpense,
  checkWithdrawExpense,
  isReceiptPath,
  newReceiptPath,
} from "./expenses";

const ok = {
  payee: "Shell",
  description: "Fuel for the site visit",
  accountId: "a",
  paidFromAccountId: "b",
  amountMinor: 85_000,
  date: "2026-10-22",
  today: "2026-10-23",
};

describe("submitting an expense", () => {
  it("accepts a complete one", () => expect(checkExpense(ok)).toBeNull());
  it("explains each missing piece", () => {
    const errors = checkExpense({
      ...ok,
      payee: " ",
      description: "",
      accountId: "",
      paidFromAccountId: "",
      amountMinor: 0,
      date: "2026-02-30",
    });
    expect(Object.keys(errors ?? {}).sort()).toEqual(
      ["account", "amount", "date", "description", "paidFrom", "payee"].sort(),
    );
  });
  it("won't take a date far in the future", () => {
    expect(checkExpense({ ...ok, date: "2026-10-30" })?.date).toBeTruthy();
    expect(checkExpense({ ...ok, date: "2026-10-24" })).toBeNull();
  });
});

describe("who may change an expense", () => {
  it("lets the submitter edit while it waits or after it was sent back", () => {
    for (const status of ["submitted", "rejected"] as const)
      expect(checkEditExpense({ status, submittedBy: "me", actorId: "me" })).toBeNull();
  });
  it("refuses other people and anything decided", () => {
    expect(checkEditExpense({ status: "submitted", submittedBy: "me", actorId: "you" })).toMatch(
      /submitted/,
    );
    expect(checkEditExpense({ status: "approved", submittedBy: "me", actorId: "me" })).toMatch(
      /approved/,
    );
  });
  it("lets an approver withdraw someone else's, but never an approved one", () => {
    const base = {
      status: "submitted" as const,
      submittedBy: "me",
      actorId: "boss",
      canApprove: true,
    };
    expect(checkWithdrawExpense(base)).toBeNull();
    expect(checkWithdrawExpense({ ...base, canApprove: false })).toMatch(/submitted/);
    expect(checkWithdrawExpense({ ...base, status: "approved" })).toMatch(/Void/);
  });
});

describe("approving", () => {
  it("needs a receipt above the threshold", () => {
    const big = {
      status: "submitted" as const,
      amountMinor: RECEIPT_REQUIRED_OVER_MINOR + 1,
      receiptCount: 0,
    };
    expect(checkApproveExpense(big)).toMatch(/receipt/);
    expect(checkApproveExpense({ ...big, receiptCount: 1 })).toBeNull();
    expect(checkApproveExpense({ ...big, amountMinor: RECEIPT_REQUIRED_OVER_MINOR })).toBeNull();
  });
  it("only applies to an expense waiting for a decision", () => {
    expect(checkApproveExpense({ status: "approved", amountMinor: 1, receiptCount: 0 })).toMatch(
      /waiting/,
    );
    expect(checkRejectExpense({ status: "rejected", reason: "x" })).toMatch(/waiting/);
    expect(checkRejectExpense({ status: "submitted", reason: " " })).toMatch(/why/);
    expect(checkRejectExpense({ status: "submitted", reason: "No receipt" })).toBeNull();
  });
  it("voids only what is approved, with a reason", () => {
    expect(checkVoidExpense({ status: "approved", reason: "Duplicate" })).toBeNull();
    expect(checkVoidExpense({ status: "approved", reason: "" })).toMatch(/why/);
    expect(checkVoidExpense({ status: "submitted", reason: "x" })).toMatch(/approved/);
    expect(checkVoidExpense({ status: "void", reason: "x" })).toMatch(/already/);
  });
});

describe("receipts", () => {
  it("checks size, count and whether the expense is still open", () => {
    expect(checkReceiptUpload({ size: 1000 }, 0, "submitted")).toBeNull();
    expect(checkReceiptUpload({ size: 0 }, 0, "submitted")).toMatch(/empty/);
    expect(checkReceiptUpload({ size: 5 * 1024 * 1024 }, 0, "submitted")).toMatch(/4 MB/);
    expect(checkReceiptUpload({ size: 1000 }, 5, "submitted")).toMatch(/5 receipts/);
    expect(checkReceiptUpload({ size: 1000 }, 0, "approved")).toMatch(/approved/);
  });
  it("stores under a random name only", () => {
    expect(isReceiptPath(newReceiptPath("pdf"))).toBe(true);
    expect(isReceiptPath("finance/../secret.pdf")).toBe(false);
    expect(isReceiptPath("crm/11111111-1111-1111-1111-111111111111.pdf")).toBe(false);
  });
});
