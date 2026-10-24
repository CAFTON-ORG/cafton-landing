import { describe, expect, it } from "vitest";

import {
  balanceOf,
  checkAccount,
  checkAccountChange,
  checkClose,
  checkEntry,
  checkPostingDate,
  checkReopen,
  checkReverse,
  checkTaxRate,
  codeFitsType,
  entryTotals,
  monthRange,
  parseRate,
  periodOf,
  rateText,
  reversalLines,
  roundDiv,
  splitGross,
  splitProportionally,
  taxOf,
  type EntryLine,
  type PeriodStatus,
} from "./core";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const usable = new Set([A, B]);
const line = (accountId: string, debitMinor: number, creditMinor: number): EntryLine => ({
  accountId,
  debitMinor,
  creditMinor,
});
const base = {
  date: "2026-11-10",
  memo: "Owner put in cash",
  today: "2026-11-10",
  usableAccountIds: usable,
};

describe("accounts", () => {
  it("grows an account on its normal side", () => {
    expect(balanceOf("asset", 1000, 300)).toBe(700);
    expect(balanceOf("expense", 500, 0)).toBe(500);
    expect(balanceOf("liability", 100, 900)).toBe(800);
    expect(balanceOf("revenue", 0, 1200)).toBe(1200);
    expect(balanceOf("equity", 50, 20)).toBe(-30);
  });

  it("needs a 4 to 6 digit code and a name", () => {
    expect(checkAccount({ code: "6100", name: "Rent" })).toEqual({});
    expect(checkAccount({ code: "61", name: "Rent" }).code).toBeTruthy();
    expect(checkAccount({ code: "61A0", name: "Rent" }).code).toBeTruthy();
    expect(checkAccount({ code: "6100", name: " " }).name).toBeTruthy();
    expect(checkAccount({ code: "6100", name: "x".repeat(121) }).name).toBeTruthy();
  });

  it("groups codes by type", () => {
    expect(codeFitsType("1010", "asset")).toBe(true);
    expect(codeFitsType("1010", "expense")).toBe(false);
    expect(codeFitsType("6500", "expense")).toBe(true);
    expect(codeFitsType("5000", "expense")).toBe(true);
    expect(codeFitsType("4000", "revenue")).toBe(true);
  });

  it("protects an account the system posts to, and one with postings", () => {
    const free = { systemKey: null, hasPostings: false, typeChanged: false, archiving: false };
    expect(checkAccountChange(free)).toBeNull();
    expect(checkAccountChange({ ...free, typeChanged: true })).toBeNull();
    expect(checkAccountChange({ ...free, typeChanged: true, hasPostings: true })).toMatch(
      /keeps its type/,
    );
    expect(checkAccountChange({ ...free, systemKey: "ar", typeChanged: true })).toMatch(
      /type is fixed/,
    );
    expect(checkAccountChange({ ...free, systemKey: "ar", archiving: true })).toMatch(
      /can't be archived/,
    );
    expect(checkAccountChange({ ...free, archiving: true })).toBeNull();
  });
});

describe("journal entries", () => {
  it("accepts a balanced entry", () => {
    expect(checkEntry({ ...base, lines: [line(A, 100_00, 0), line(B, 0, 100_00)] })).toBeNull();
    // Several lines on a side are fine as long as the totals match.
    expect(
      checkEntry({ ...base, lines: [line(A, 60_00, 0), line(A, 40_00, 0), line(B, 0, 100_00)] }),
    ).toBeNull();
  });

  it("refuses an entry that doesn't balance, and says by how much", () => {
    const errors = checkEntry({ ...base, lines: [line(A, 100_00, 0), line(B, 0, 99_99)] });
    expect(errors?.form).toMatch(/doesn't balance.*₱0\.01/);
  });

  it("needs two lines, a memo and a sensible date", () => {
    expect(checkEntry({ ...base, lines: [line(A, 100, 0)] })?.form).toMatch(/at least two/);
    expect(
      checkEntry({ ...base, memo: " ", lines: [line(A, 1, 0), line(B, 0, 1)] })?.memo,
    ).toBeTruthy();
    expect(checkPostingDate("2026-13-45", "2026-11-10")).toBe("Pick a date.");
    expect(checkPostingDate("2026-02-30", "2026-11-10")).toBe("Pick a date.");
    expect(
      checkEntry({ ...base, date: "soon", lines: [line(A, 1, 0), line(B, 0, 1)] })?.date,
    ).toBeTruthy();
    expect(
      checkEntry({ ...base, date: "2027-01-20", lines: [line(A, 1, 0), line(B, 0, 1)] })?.date,
    ).toMatch(/ahead/);
  });

  it("refuses lines that are both sides, neither side, negative, fractional or on a bad account", () => {
    const check = (...lines: EntryLine[]) => checkEntry({ ...base, lines })?.lines ?? {};
    expect(check(line(A, 5, 5), line(B, 0, 5))[0]).toMatch(/not both/);
    expect(check(line(A, 0, 0), line(B, 0, 5))[0]).toMatch(/debit or a credit/);
    expect(check(line(A, -5, 0), line(B, 0, 5))[0]).toMatch(/whole centavos/);
    expect(check(line(A, 5.5, 0), line(B, 0, 5.5))[0]).toMatch(/whole centavos/);
    expect(check(line("33333333-3333-4333-8333-333333333333", 5, 0), line(B, 0, 5))[0]).toMatch(
      /in use/,
    );
  });

  it("sums debits and credits", () => {
    expect(entryTotals([line(A, 70, 0), line(A, 30, 0), line(B, 0, 100)])).toEqual({
      debitMinor: 100,
      creditMinor: 100,
      differenceMinor: 0,
    });
  });

  it("limits how far ahead an entry can be dated", () => {
    expect(checkPostingDate("2026-11-10", "2026-11-10")).toBeNull();
    expect(checkPostingDate("2026-12-10", "2026-11-10")).toBeNull();
    expect(checkPostingDate("2026-12-11", "2026-11-10")).toBeNull();
    expect(checkPostingDate("2026-12-12", "2026-11-10")).toMatch(/31 days ahead/);
    expect(checkPostingDate("1999-12-31", "2026-11-10")).toMatch(/far back/);
  });

  it("undoes an entry by swapping its sides, once", () => {
    const original = [line(A, 100, 0), line(B, 0, 100)];
    expect(reversalLines(original)).toEqual([line(A, 0, 100), line(B, 100, 0)]);
    const undone = entryTotals([...original, ...reversalLines(original)]);
    expect(undone.differenceMinor).toBe(0);
    const ok = { alreadyReversed: false, isReversal: false, reason: "Posted twice" };
    expect(checkReverse(ok)).toBeNull();
    expect(checkReverse({ ...ok, alreadyReversed: true })).toMatch(/already reversed/);
    expect(checkReverse({ ...ok, isReversal: true })).toMatch(/already undoes/);
    expect(checkReverse({ ...ok, reason: " " })).toMatch(/why/);
  });
});

describe("fiscal periods", () => {
  it("runs on the calendar year", () => {
    expect(periodOf("2026-11-10")).toEqual({ year: 2026, month: 11 });
    expect(monthRange(2026, 2)).toEqual({ startsOn: "2026-02-01", endsOn: "2026-02-28" });
    expect(monthRange(2028, 2).endsOn).toBe("2028-02-29");
    expect(monthRange(2026, 12)).toEqual({ startsOn: "2026-12-01", endsOn: "2026-12-31" });
  });

  const open = (n: number): PeriodStatus[] => Array.from({ length: n }, () => "open");

  it("closes months in order", () => {
    const statuses: PeriodStatus[] = ["closed", "closed", ...open(10)];
    expect(checkClose(statuses, 3)).toBeNull();
    expect(checkClose(statuses, 4)).toMatch(/Close March first/);
    expect(checkClose(statuses, 2)).toMatch(/already closed/);
    expect(checkClose(open(12), 1)).toBeNull();
    expect(checkClose(open(12), 2)).toMatch(/Close January first/);
  });

  it("reopens only the latest closed month", () => {
    const statuses: PeriodStatus[] = ["closed", "closed", "closed", ...open(9)];
    expect(checkReopen(statuses, 3)).toBeNull();
    expect(checkReopen(statuses, 2)).toMatch(/Reopen March first/);
    expect(checkReopen(statuses, 5)).toMatch(/isn't closed/);
  });
});

describe("tax rates and rounding", () => {
  it("reads and writes rates in basis points", () => {
    expect(parseRate("12")).toBe(1200);
    expect(parseRate("2.5%")).toBe(250);
    expect(parseRate("0.25")).toBe(25);
    expect(parseRate("100")).toBe(10000);
    expect(parseRate("101")).toBeNull();
    expect(parseRate("twelve")).toBeNull();
    expect(parseRate("1.234")).toBeNull();
    expect(rateText(1200)).toBe("12%");
    expect(rateText(250)).toBe("2.5%");
  });

  it("checks a rate's code, name and size", () => {
    expect(checkTaxRate({ code: "VAT12", name: "VAT", rateBp: 1200 })).toEqual({});
    expect(checkTaxRate({ code: "vat 12", name: "VAT", rateBp: 1200 }).code).toBeTruthy();
    expect(checkTaxRate({ code: "VAT12", name: "", rateBp: 1200 }).name).toBeTruthy();
    expect(checkTaxRate({ code: "VAT12", name: "VAT", rateBp: 10001 }).rate).toBeTruthy();
  });

  it("rounds halves away from zero, the same way every time", () => {
    expect(roundDiv(BigInt(5), BigInt(2))).toBe(BigInt(3));
    expect(roundDiv(BigInt(4), BigInt(2))).toBe(BigInt(2));
    expect(roundDiv(-BigInt(5), BigInt(2))).toBe(-BigInt(3));
    expect(roundDiv(BigInt(7), BigInt(3))).toBe(BigInt(2));
    expect(roundDiv(BigInt(1), BigInt(3))).toBe(BigInt(0));
    expect(() => roundDiv(BigInt(1), BigInt(0))).toThrow();
  });

  it("works out tax to the centavo", () => {
    expect(taxOf(100_00, 1200)).toBe(12_00);
    expect(taxOf(33_33, 1200)).toBe(4_00); // 3.9996 -> 4.00
    expect(taxOf(10_05, 1200)).toBe(1_21); // 1.206 -> 1.21
    expect(taxOf(100_00, 0)).toBe(0);
    expect(taxOf(0, 1200)).toBe(0);
  });

  it("takes a tax-inclusive price apart so the two parts add up to it", () => {
    expect(splitGross(112_00, 1200)).toEqual({ netMinor: 100_00, taxMinor: 12_00 });
    for (const gross of [1, 99, 1_00, 123_45, 9_999_99]) {
      const { netMinor, taxMinor } = splitGross(gross, 1200);
      expect(netMinor + taxMinor).toBe(gross);
    }
    expect(splitGross(500_00, 0)).toEqual({ netMinor: 500_00, taxMinor: 0 });
  });

  it("splits an amount so the parts always add up to it", () => {
    expect(splitProportionally(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(splitProportionally(100_00, [30_000_00, 70_000_00])).toEqual([30_00, 70_00]);
    expect(splitProportionally(10, [0, 0, 0])).toEqual([4, 3, 3]);
    expect(splitProportionally(0, [5, 5])).toEqual([0, 0]);
    expect(splitProportionally(5, [])).toEqual([]);
    for (const total of [1, 7, 99, 1_000_01]) {
      const parts = splitProportionally(total, [3, 5, 11, 2]);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(parts.every((part) => part >= 0)).toBe(true);
    }
  });
});
