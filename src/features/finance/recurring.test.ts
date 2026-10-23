import { describe, expect, it } from "vitest";

import {
  MAX_CATCH_UP,
  anchorDayOf,
  checkRecurring,
  dueOccurrences,
  occurrenceAfter,
  type Schedule,
} from "./recurring";

describe("the next date", () => {
  it("moves a week at a time", () => {
    expect(occurrenceAfter("2026-10-23", "weekly", 23)).toBe("2026-10-30");
    expect(occurrenceAfter("2026-12-28", "weekly", 28)).toBe("2027-01-04");
  });

  it("keeps to the day of the month, clamped to short months, without drifting", () => {
    let date = "2026-01-31";
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      date = occurrenceAfter(date, "monthly", 31);
      seen.push(date);
    }
    expect(seen).toEqual(["2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
  });

  it("knows leap years", () => {
    expect(occurrenceAfter("2027-12-31", "monthly", 31)).toBe("2028-01-31");
    expect(occurrenceAfter("2028-01-31", "monthly", 31)).toBe("2028-02-29");
    expect(occurrenceAfter("2028-02-29", "yearly", 29)).toBe("2029-02-28");
  });

  it("steps quarters and years across the year end", () => {
    expect(occurrenceAfter("2026-11-15", "quarterly", 15)).toBe("2027-02-15");
    expect(occurrenceAfter("2026-04-15", "yearly", 15)).toBe("2027-04-15");
  });

  it("reads the anchor from the first date", () => expect(anchorDayOf("2026-01-31")).toBe(31));
});

const base: Schedule = {
  nextDate: "2026-08-01",
  endDate: null,
  frequency: "monthly",
  anchorDay: 1,
  active: true,
};

describe("what is due", () => {
  it("makes nothing before the date", () => {
    expect(dueOccurrences(base, "2026-07-31")).toEqual({
      dates: [],
      nextDate: "2026-08-01",
      finished: false,
    });
  });

  it("makes the one that is due, and moves on", () => {
    expect(dueOccurrences(base, "2026-08-01")).toEqual({
      dates: ["2026-08-01"],
      nextDate: "2026-09-01",
      finished: false,
    });
  });

  it("catches up missed ones, oldest first", () => {
    expect(dueOccurrences(base, "2026-10-23").dates).toEqual([
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
    ]);
  });

  it("caps a long catch-up", () => {
    const run = dueOccurrences({ ...base, nextDate: "2020-01-01" }, "2026-10-23");
    expect(run.dates).toHaveLength(MAX_CATCH_UP);
    expect(run.nextDate > run.dates.at(-1)!).toBe(true);
  });

  it("stops at the end date and says it is finished", () => {
    const run = dueOccurrences({ ...base, endDate: "2026-09-15" }, "2026-12-01");
    expect(run.dates).toEqual(["2026-08-01", "2026-09-01"]);
    expect(run.finished).toBe(true);
  });

  it("does nothing while paused", () => {
    expect(dueOccurrences({ ...base, active: false }, "2026-12-01")).toEqual({
      dates: [],
      nextDate: "2026-08-01",
      finished: false,
    });
  });
});

describe("saving one", () => {
  const ok = {
    kind: "bill" as const,
    name: "Office rent",
    startDate: "2026-11-01",
    endDate: null,
    vendorId: "v",
    payee: "",
    description: "Monthly rent",
    accountId: "a",
    paidFromAccountId: "",
    amountMinor: 1_500_000,
  };
  it("accepts a complete bill", () => expect(checkRecurring(ok)).toBeNull());
  it("a bill needs a supplier; an expense needs a payee and a source", () => {
    expect(checkRecurring({ ...ok, vendorId: null })?.vendor).toBeTruthy();
    const expense = { ...ok, kind: "expense" as const, vendorId: null };
    expect(Object.keys(checkRecurring(expense) ?? {})).toEqual(["payee", "paidFrom"]);
    expect(checkRecurring({ ...expense, payee: "Meralco", paidFromAccountId: "b" })).toBeNull();
  });
  it("checks the dates, name and amount", () => {
    expect(checkRecurring({ ...ok, startDate: "2026-02-30" })?.startDate).toBeTruthy();
    expect(checkRecurring({ ...ok, endDate: "2026-10-01" })?.endDate).toBeTruthy();
    expect(checkRecurring({ ...ok, name: " " })?.name).toBeTruthy();
    expect(checkRecurring({ ...ok, amountMinor: 0 })?.amount).toBeTruthy();
  });
});
