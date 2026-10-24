import { describe, expect, it } from "vitest";

import {
  ANNUAL_ALLOWANCE_MINOR,
  checkFiling,
  checkVoidFiling,
  estimateTax,
  filingStatus,
  measuredUpTo,
  obligationsFor,
} from "./tax";

const [q1, q2, q3, annual] = obligationsFor(2026);

describe("the returns of a year", () => {
  it("falls due on the 15th of May, August and November, and April after", () => {
    expect([q1, q2, q3, annual].map((o) => o.dueDate)).toEqual([
      "2026-05-15",
      "2026-08-15",
      "2026-11-15",
      "2027-04-15",
    ]);
    expect([q1, q2, q3, annual].map((o) => o.form)).toEqual(["1701Q", "1701Q", "1701Q", "1701A"]);
  });
  it("works on the year so far, ending each quarter", () => {
    expect([q1, q2, q3, annual].map((o) => o.periodEnd)).toEqual([
      "2026-03-31",
      "2026-06-30",
      "2026-09-30",
      "2026-12-31",
    ]);
    expect(new Set([q1, q2, q3, annual].map((o) => o.periodStart))).toEqual(
      new Set(["2026-01-01"]),
    );
  });
});

describe("the estimate", () => {
  it("is nothing until receipts pass 250,000 pesos", () => {
    const result = estimateTax({
      grossToDateMinor: ANNUAL_ALLOWANCE_MINOR,
      settledBeforeMinor: 0,
      cwtAvailableMinor: 0,
    });
    expect(result).toMatchObject({ taxableMinor: 0, taxToDateMinor: 0, cashDueMinor: 0 });
  });

  it("is 8% of what is above the allowance", () => {
    // 400,000 gross: 150,000 taxable, 12,000 tax.
    const result = estimateTax({
      grossToDateMinor: 40_000_000,
      settledBeforeMinor: 0,
      cwtAvailableMinor: 0,
    });
    expect(result).toMatchObject({
      taxableMinor: 15_000_000,
      taxToDateMinor: 1_200_000,
      cashDueMinor: 1_200_000,
    });
  });

  it("takes off what earlier returns settled, so each return only pays the difference", () => {
    const q2Result = estimateTax({
      grossToDateMinor: 60_000_000,
      settledBeforeMinor: 1_200_000,
      cwtAvailableMinor: 0,
    });
    expect(q2Result.taxToDateMinor).toBe(2_800_000);
    expect(q2Result.remainingMinor).toBe(1_600_000);
  });

  it("credits withheld tax before asking for cash, never more than is owed", () => {
    const some = estimateTax({
      grossToDateMinor: 40_000_000,
      settledBeforeMinor: 0,
      cwtAvailableMinor: 500_000,
    });
    expect(some).toMatchObject({ cwtToApplyMinor: 500_000, cashDueMinor: 700_000 });
    const plenty = estimateTax({
      grossToDateMinor: 40_000_000,
      settledBeforeMinor: 0,
      cwtAvailableMinor: 9_000_000,
    });
    expect(plenty).toMatchObject({ cwtToApplyMinor: 1_200_000, cashDueMinor: 0 });
  });

  it("notes an overpayment instead of going negative", () => {
    const result = estimateTax({
      grossToDateMinor: 30_000_000,
      settledBeforeMinor: 1_000_000,
      cwtAvailableMinor: 0,
    });
    expect(result).toMatchObject({
      taxToDateMinor: 400_000,
      remainingMinor: 0,
      cashDueMinor: 0,
      overpaidMinor: 600_000,
    });
  });

  it("rounds the tax to the centavo", () => {
    // 250,000.33 above the allowance at 8% = 20,000.0264 -> 20,000.03
    const result = estimateTax({
      grossToDateMinor: ANNUAL_ALLOWANCE_MINOR + 25_000_033,
      settledBeforeMinor: 0,
      cwtAvailableMinor: 0,
    });
    expect(result.taxToDateMinor).toBe(2_000_003);
  });
});

describe("where a return stands", () => {
  it("is in progress until its period ends", () => {
    expect(filingStatus(q1, false, "2026-03-31")).toBe("in_progress");
  });
  it("is ready, then due soon within two weeks, then overdue", () => {
    expect(filingStatus(q1, false, "2026-04-02")).toBe("due");
    expect(filingStatus(q1, false, "2026-05-01")).toBe("due_soon");
    expect(filingStatus(q1, false, "2026-05-15")).toBe("due_soon");
    expect(filingStatus(q1, false, "2026-05-16")).toBe("overdue");
  });
  it("is filed once recorded, whatever the date", () => {
    expect(filingStatus(q1, true, "2027-01-01")).toBe("filed");
  });
  it("measures receipts up to today while the period is still running", () => {
    expect(measuredUpTo(q2, "2026-05-20")).toBe("2026-05-20");
    expect(measuredUpTo(q2, "2026-09-01")).toBe("2026-06-30");
  });
});

describe("recording a filing", () => {
  const ok = {
    obligation: q1,
    earlierFiled: [] as boolean[],
    alreadyFiled: false,
    filedOn: "2026-05-10",
    today: "2026-05-12",
    cashMinor: 700_000,
    cwtMinor: 500_000,
    cwtAvailableMinor: 500_000,
    paidFromAccountId: "bank",
    reference: "1701Q-123",
  };
  it("accepts a complete one", () => expect(checkFiling(ok)).toBeNull());
  it("refuses one already recorded, or before its period ends", () => {
    expect(checkFiling({ ...ok, alreadyFiled: true })?.form).toMatch(/already recorded/);
    expect(checkFiling({ ...ok, today: "2026-03-31", filedOn: "2026-03-30" })?.form).toMatch(
      /until its period ends/,
    );
  });
  it("wants the earlier returns first", () => {
    expect(
      checkFiling({
        ...ok,
        obligation: q2,
        earlierFiled: [true, false],
        filedOn: "2026-08-10",
        today: "2026-08-12",
      })?.form,
    ).toMatch(/earlier returns first/);
    expect(
      checkFiling({
        ...ok,
        obligation: q2,
        earlierFiled: [true],
        filedOn: "2026-08-10",
        today: "2026-08-12",
      }),
    ).toBeNull();
  });
  it("checks the date, the amounts and the source of the payment", () => {
    expect(checkFiling({ ...ok, filedOn: "2026-02-30" })?.filedOn).toBeTruthy();
    expect(checkFiling({ ...ok, filedOn: "2026-05-20" })?.filedOn).toMatch(/future/);
    expect(checkFiling({ ...ok, filedOn: "2026-03-30" })?.filedOn).toMatch(/before its period/);
    expect(checkFiling({ ...ok, cashMinor: -1 })?.cash).toBeTruthy();
    expect(checkFiling({ ...ok, cwtMinor: 600_000 })?.cwt).toMatch(/available/);
    expect(checkFiling({ ...ok, paidFromAccountId: "" })?.paidFrom).toBeTruthy();
    expect(checkFiling({ ...ok, cashMinor: 0, paidFromAccountId: "" })).toBeNull();
    expect(checkFiling({ ...ok, reference: "x".repeat(61) })?.reference).toBeTruthy();
  });
  it("needs a reason to void", () => {
    expect(checkVoidFiling({ status: "filed", reason: "Wrong figures" })).toBeNull();
    expect(checkVoidFiling({ status: "filed", reason: " " })).toMatch(/why/);
    expect(checkVoidFiling({ status: "void", reason: "x" })).toMatch(/already/);
  });
});
