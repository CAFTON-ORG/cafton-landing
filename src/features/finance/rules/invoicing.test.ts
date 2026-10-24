import { describe, expect, it } from "vitest";

import {
  agingBucket,
  balanceOf,
  checkCreditNote,
  checkDraft,
  checkIssue,
  checkMilestoneInvoiceable,
  checkPayment,
  checkVoidInvoice,
  checkVoidSettlement,
  daysPastDue,
  dueDateFor,
  invoiceTotals,
  lineAmount,
  reminderDue,
  stateOf,
  unappliedOf,
  type InvoiceStatus,
} from "./invoicing";

describe("invoice amounts", () => {
  it("multiplies quantity by price to the centavo, halves away from zero", () => {
    expect(lineAmount(1000, 12_500_00)).toBe(12_500_00);
    expect(lineAmount(1500, 3_333_33)).toBe(5_000_00); // 4,999.995 -> 5,000.00
    expect(lineAmount(500, 1)).toBe(1); // 0.5 centavo rounds up
    expect(lineAmount(333, 100)).toBe(33);
  });

  it("adds lines up, with no tax by default", () => {
    expect(
      invoiceTotals(
        [
          { amountMinor: 100_00, taxable: false },
          { amountMinor: 50_00, taxable: false },
        ],
        0,
      ),
    ).toEqual({ subtotalMinor: 150_00, taxMinor: 0, totalMinor: 150_00 });
  });

  it("takes VAT on the taxable lines together, rounded once", () => {
    const totals = invoiceTotals(
      [
        { amountMinor: 33_33, taxable: true },
        { amountMinor: 33_33, taxable: true },
        { amountMinor: 33_34, taxable: false },
      ],
      1200,
    );
    expect(totals).toEqual({ subtotalMinor: 100_00, taxMinor: 8_00, totalMinor: 108_00 });
  });
});

describe("drafts and issuing", () => {
  const line = { description: "Website design", quantityMilli: 1000, unitPriceMinor: 50_000_00 };

  it("accepts a sensible draft", () => {
    expect(checkDraft({ clientName: "Acme", lines: [line] })).toBeNull();
  });

  it("says what is wrong", () => {
    expect(checkDraft({ clientName: " ", lines: [line] })?.clientName).toBeTruthy();
    expect(
      checkDraft({ clientName: "A", issueDate: "2026-11-10", dueDate: "2026-11-01", lines: [line] })
        ?.dueDate,
    ).toMatch(/before/);
    expect(
      checkDraft({ clientName: "A", issueDate: "2026-02-30", lines: [line] })?.issueDate,
    ).toBeTruthy();
    const lines = checkDraft({
      clientName: "A",
      lines: [
        { ...line, description: " " },
        { ...line, quantityMilli: 0 },
        { ...line, unitPriceMinor: -1 },
        line,
      ],
    })?.lines;
    expect(Object.keys(lines ?? {})).toEqual(["0", "1", "2"]);
  });

  const ready = {
    status: "draft" as InvoiceStatus,
    clientName: "Acme",
    lineCount: 1,
    totalMinor: 100,
    issueDate: "2026-11-10",
    dueDate: "2026-11-25",
    today: "2026-11-10",
  };

  it("is issued only when complete", () => {
    expect(checkIssue(ready)).toBeNull();
    expect(checkIssue({ ...ready, status: "issued" })).toMatch(/Only a draft/);
    expect(checkIssue({ ...ready, clientName: "" })).toMatch(/who/);
    expect(checkIssue({ ...ready, lineCount: 0 })).toMatch(/at least one line/);
    expect(checkIssue({ ...ready, totalMinor: 0 })).toMatch(/more than zero/);
    expect(checkIssue({ ...ready, dueDate: null })).toMatch(/dates/);
    expect(checkIssue({ ...ready, dueDate: "2026-11-01" })).toMatch(/before/);
    expect(checkIssue({ ...ready, issueDate: "2027-03-01", dueDate: "2027-03-15" })).toMatch(
      /too far ahead/,
    );
  });

  it("sets the due date from the terms", () => {
    expect(dueDateFor("2026-11-10", 15)).toBe("2026-11-25");
    expect(dueDateFor("2026-12-20", 15)).toBe("2027-01-04");
  });
});

describe("what is owed and where an invoice stands", () => {
  const base = {
    totalMinor: 1000_00,
    settledMinor: 0,
    creditedMinor: 0,
    dueDate: "2026-11-30",
    status: "issued" as InvoiceStatus,
  };

  it("subtracts payments and credits", () => {
    expect(balanceOf(base)).toBe(1000_00);
    expect(balanceOf({ ...base, settledMinor: 400_00, creditedMinor: 100_00 })).toBe(500_00);
  });

  it("reads the state a person cares about", () => {
    expect(stateOf({ ...base, status: "draft" }, "2026-11-10")).toBe("draft");
    expect(stateOf({ ...base, status: "void" }, "2026-11-10")).toBe("void");
    expect(stateOf(base, "2026-11-10")).toBe("open");
    expect(stateOf({ ...base, settledMinor: 100_00 }, "2026-11-10")).toBe("partial");
    expect(stateOf(base, "2026-12-01")).toBe("overdue");
    expect(stateOf({ ...base, settledMinor: 100_00 }, "2026-12-01")).toBe("overdue");
    expect(stateOf({ ...base, settledMinor: 1000_00 }, "2026-12-01")).toBe("paid");
    expect(stateOf({ ...base, settledMinor: 900_00, creditedMinor: 100_00 }, "2026-12-01")).toBe(
      "paid",
    );
  });

  it("buckets lateness for the aging report", () => {
    expect(daysPastDue("2026-11-30", "2026-12-10")).toBe(10);
    expect(agingBucket("2026-11-30", "2026-11-30")).toBe("current");
    expect(agingBucket("2026-11-30", "2026-12-01")).toBe("1-30");
    expect(agingBucket("2026-11-30", "2026-12-30")).toBe("1-30");
    expect(agingBucket("2026-11-30", "2026-12-31")).toBe("31-60");
    expect(agingBucket("2026-11-30", "2027-01-29")).toBe("31-60");
    expect(agingBucket("2026-11-30", "2027-01-30")).toBe("61-90");
    expect(agingBucket("2026-11-30", "2027-03-01")).toBe("90+");
  });
});

describe("reminders", () => {
  const due = {
    state: "overdue" as const,
    dueDate: "2026-11-01",
    today: "2026-11-05",
    reminderCount: 0,
    lastReminderOn: null,
    hasEmail: true,
  };

  it("starts a few days late, then weekly, at most three", () => {
    expect(reminderDue(due)).toBe(true);
    expect(reminderDue({ ...due, today: "2026-11-03" })).toBe(false);
    expect(
      reminderDue({ ...due, reminderCount: 1, lastReminderOn: "2026-11-05", today: "2026-11-10" }),
    ).toBe(false);
    expect(
      reminderDue({ ...due, reminderCount: 1, lastReminderOn: "2026-11-05", today: "2026-11-12" }),
    ).toBe(true);
    expect(
      reminderDue({ ...due, reminderCount: 3, lastReminderOn: "2026-11-05", today: "2026-12-30" }),
    ).toBe(false);
  });

  it("never nags a paid, open or unreachable client", () => {
    expect(reminderDue({ ...due, state: "paid" })).toBe(false);
    expect(reminderDue({ ...due, state: "open" })).toBe(false);
    expect(reminderDue({ ...due, hasEmail: false })).toBe(false);
  });
});

describe("recording a payment", () => {
  const invoices = new Map([
    ["a", { status: "issued" as InvoiceStatus, balanceMinor: 1000_00, number: "INV-2026-0001" }],
    ["b", { status: "issued" as InvoiceStatus, balanceMinor: 500_00, number: "INV-2026-0002" }],
    ["c", { status: "draft" as InvoiceStatus, balanceMinor: 0, number: null }],
  ]);
  const base = {
    amountMinor: 1000_00,
    cwtMinor: 0,
    receivedDate: "2026-11-10",
    today: "2026-11-10",
    invoices,
  };

  it("accepts a payment that settles an invoice, or part of it", () => {
    expect(
      checkPayment({ ...base, allocations: [{ invoiceId: "a", amountMinor: 1000_00 }] }),
    ).toBeNull();
    expect(
      checkPayment({ ...base, allocations: [{ invoiceId: "a", amountMinor: 400_00 }] }),
    ).toBeNull();
    expect(
      checkPayment({
        ...base,
        amountMinor: 1500_00,
        allocations: [
          { invoiceId: "a", amountMinor: 1000_00 },
          { invoiceId: "b", amountMinor: 500_00 },
        ],
      }),
    ).toBeNull();
  });

  it("counts tax the client withheld towards the invoice, not as cash", () => {
    // 2% withheld on 1,000: 980 arrives, 20 is certified, 1,000 settles the invoice.
    expect(
      checkPayment({
        ...base,
        amountMinor: 980_00,
        cwtMinor: 20_00,
        allocations: [{ invoiceId: "a", amountMinor: 1000_00 }],
      }),
    ).toBeNull();
    expect(unappliedOf(980_00, 20_00, [{ invoiceId: "a", amountMinor: 1000_00 }])).toBe(0);
    expect(unappliedOf(1500_00, 0, [{ invoiceId: "a", amountMinor: 1000_00 }])).toBe(500_00);
  });

  it("refuses what doesn't add up", () => {
    expect(checkPayment({ ...base, amountMinor: 0, allocations: [] })?.amount).toBeTruthy();
    expect(checkPayment({ ...base, receivedDate: "2026-11-11", allocations: [] })?.date).toMatch(
      /future/,
    );
    expect(
      checkPayment({ ...base, allocations: [{ invoiceId: "a", amountMinor: 1200_00 }] })
        ?.allocations?.a,
    ).toMatch(/only owed/);
    expect(
      checkPayment({ ...base, allocations: [{ invoiceId: "c", amountMinor: 10 }] })?.allocations?.c,
    ).toMatch(/isn't open/);
    expect(
      checkPayment({ ...base, allocations: [{ invoiceId: "zzz", amountMinor: 10 }] })?.allocations
        ?.zzz,
    ).toMatch(/no longer exists/);
    expect(
      checkPayment({
        ...base,
        amountMinor: 1000_00,
        allocations: [
          { invoiceId: "a", amountMinor: 1000_00 },
          { invoiceId: "b", amountMinor: 500_00 },
        ],
      })?.form,
    ).toMatch(/more than was received/);
    expect(
      checkPayment({
        ...base,
        allocations: [
          { invoiceId: "a", amountMinor: 10 },
          { invoiceId: "a", amountMinor: 10 },
        ],
      })?.allocations?.a,
    ).toMatch(/once/);
  });

  it("takes no more withholding than the invoices it pays", () => {
    expect(
      checkPayment({
        ...base,
        amountMinor: 100_00,
        cwtMinor: 500_00,
        allocations: [{ invoiceId: "a", amountMinor: 200_00 }],
      })?.cwt,
    ).toMatch(/can't be more/);
  });
});

describe("credit notes and voids", () => {
  const credit = {
    invoiceStatus: "issued" as InvoiceStatus,
    balanceMinor: 1000_00,
    subtotalMinor: 200_00,
    taxMinor: 0,
    reason: "Scope reduced",
  };

  it("takes back no more than is owed", () => {
    expect(checkCreditNote(credit)).toBeNull();
    expect(checkCreditNote({ ...credit, subtotalMinor: 1000_00 })).toBeNull();
    expect(checkCreditNote({ ...credit, subtotalMinor: 1000_01 })?.form).toMatch(/still owed/);
    expect(checkCreditNote({ ...credit, subtotalMinor: 900_00, taxMinor: 200_00 })?.form).toMatch(
      /still owed/,
    );
    expect(checkCreditNote({ ...credit, subtotalMinor: 0 })?.subtotal).toBeTruthy();
    expect(checkCreditNote({ ...credit, reason: " " })?.reason).toBeTruthy();
    expect(checkCreditNote({ ...credit, invoiceStatus: "draft" })?.form).toMatch(/issued invoice/);
  });

  it("voids an invoice only when nothing was paid or credited", () => {
    const ok = {
      status: "issued" as InvoiceStatus,
      settledMinor: 0,
      creditedMinor: 0,
      reason: "Wrong client",
    };
    expect(checkVoidInvoice(ok)).toBeNull();
    expect(checkVoidInvoice({ ...ok, settledMinor: 1 })).toMatch(/Payments/);
    expect(checkVoidInvoice({ ...ok, creditedMinor: 1 })).toMatch(/Credit notes/);
    expect(checkVoidInvoice({ ...ok, reason: "" })).toMatch(/why/);
    expect(checkVoidInvoice({ ...ok, status: "void" })).toMatch(/already void/);
    expect(checkVoidInvoice({ ...ok, status: "draft" })).toMatch(/deleted/);
  });

  it("voids a payment or credit note once, with a reason", () => {
    expect(checkVoidSettlement({ status: "recorded", reason: "Bounced" })).toBeNull();
    expect(checkVoidSettlement({ status: "void", reason: "Again" })).toMatch(/already void/);
    expect(checkVoidSettlement({ status: "recorded", reason: " " })).toMatch(/why/);
  });
});

describe("billing milestones", () => {
  const ok = {
    name: "Design",
    status: "done",
    billable: true,
    amountMinor: 50_000_00,
    alreadyInvoiced: false,
  };
  it("needs a finished, billable milestone not billed already", () => {
    expect(checkMilestoneInvoiceable(ok)).toBeNull();
    expect(checkMilestoneInvoiceable({ ...ok, billable: false })).toMatch(/isn't billable/);
    expect(checkMilestoneInvoiceable({ ...ok, amountMinor: null })).toMatch(/isn't billable/);
    expect(checkMilestoneInvoiceable({ ...ok, status: "in_progress" })).toMatch(/isn't finished/);
    expect(checkMilestoneInvoiceable({ ...ok, alreadyInvoiced: true })).toMatch(
      /already on an invoice/,
    );
  });
});
