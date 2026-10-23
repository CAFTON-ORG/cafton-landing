import { describe, expect, it } from "vitest";

import {
  autoMatch,
  checkSignOff,
  fingerprintKeys,
  mapStatement,
  parseAmount,
  parseBankDate,
  statementDifference,
  suggestMatches,
  type LedgerCandidate,
  type StatementLineLite,
} from "./bank";

describe("amounts", () => {
  it("reads the ways banks write them", () => {
    expect(parseAmount("1,234.50")).toBe(123_450);
    expect(parseAmount("-1234.5")).toBe(-123_450);
    expect(parseAmount("(250.00)")).toBe(-25_000);
    expect(parseAmount("₱ 99")).toBe(9_900);
    expect(parseAmount("PHP 1,000.00")).toBe(100_000);
    expect(parseAmount("500.00 CR")).toBe(50_000);
    expect(parseAmount("500.00 DR")).toBe(-50_000);
    expect(parseAmount("+12.3")).toBe(1_230);
  });
  it("refuses what is not an amount", () => {
    for (const bad of ["", "abc", "1.234", "12,3,4a", "1e5", "--5"])
      expect(parseAmount(bad)).toBeNull();
  });
});

describe("dates", () => {
  it("reads each format and names the month", () => {
    expect(parseBankDate("2026-10-23", "ymd")).toBe("2026-10-23");
    expect(parseBankDate("10/23/2026", "mdy")).toBe("2026-10-23");
    expect(parseBankDate("23/10/2026", "dmy")).toBe("2026-10-23");
    expect(parseBankDate("5-Jan-2026", "mdy")).toBe("2026-01-05");
    expect(parseBankDate("Jan 5, 2026", "dmy")).toBe("2026-01-05");
    expect(parseBankDate("23/10/26", "dmy")).toBe("2026-10-23");
    expect(parseBankDate("2026-10-23 14:05", "ymd")).toBe("2026-10-23");
  });
  it("reads an ambiguous date the way it is told to", () => {
    expect(parseBankDate("03/04/2026", "mdy")).toBe("2026-03-04");
    expect(parseBankDate("03/04/2026", "dmy")).toBe("2026-04-03");
  });
  it("refuses what is not a real date", () => {
    expect(parseBankDate("13/13/2026", "mdy")).toBeNull();
    expect(parseBankDate("2026-02-30", "ymd")).toBeNull();
    expect(parseBankDate("10/23/2026", "ymd")).toBeNull();
    expect(parseBankDate("", "ymd")).toBeNull();
  });
});

describe("reading a statement", () => {
  it("understands one signed amount column", () => {
    const result = mapStatement(
      [
        ["Date", "Description", "Amount", "Balance"],
        ["2026-10-01", "Opening deposit", "10,000.00", "10,000.00"],
        ["2026-10-02", "ATM fee", "-25.00", "9,975.00"],
      ],
      "ymd",
    );
    expect(result.problems).toEqual([]);
    expect(result.rows).toMatchObject([
      { date: "2026-10-01", amountMinor: 1_000_000, balanceMinor: 1_000_000 },
      { date: "2026-10-02", amountMinor: -2_500, balanceMinor: 997_500 },
    ]);
  });

  it("understands separate debit and credit columns, with a reference", () => {
    const result = mapStatement(
      [
        ["Posting Date", "Particulars", "Check No", "Debit", "Credit"],
        ["10/02/2026", "Rent", "1042", "15,000.00", ""],
        ["10/03/2026", "Payment from Acme", "", "", "8,000.00"],
      ],
      "mdy",
    );
    expect(result.rows).toMatchObject([
      { amountMinor: -1_500_000, reference: "1042" },
      { amountMinor: 800_000 },
    ]);
  });

  it("reports unreadable rows by line number and keeps the rest", () => {
    const result = mapStatement(
      [
        ["Date", "Description", "Amount"],
        ["not a date", "x", "5"],
        ["2026-10-02", "y", "abc"],
        ["2026-10-02", "z", "0.00"],
        ["2026-10-03", "ok", "5"],
      ],
      "ymd",
    );
    expect(result.rows).toHaveLength(1);
    expect(result.problems.map((p) => p.line)).toEqual([2, 3, 4]);
  });

  it("says what is missing", () => {
    expect(
      mapStatement(
        [
          ["Date", "Amount"],
          ["2026-10-01", "5"],
        ],
        "ymd",
      ).fatal,
    ).toMatch(/description/);
    expect(
      mapStatement(
        [
          ["Description", "Amount"],
          ["x", "5"],
        ],
        "ymd",
      ).fatal,
    ).toMatch(/date/);
    expect(
      mapStatement(
        [
          ["Date", "Description"],
          ["2026-10-01", "x"],
        ],
        "ymd",
      ).fatal,
    ).toMatch(/amount/);
    expect(mapStatement([["Date"]], "ymd").fatal).toMatch(/no rows/);
  });
});

describe("recognising a line already imported", () => {
  const row = (description: string) => ({
    line: 2,
    date: "2026-10-02",
    description,
    amountMinor: -5_000,
  });
  it("numbers identical lines in one file, so re-importing finds them all", () => {
    const keys = fingerprintKeys([row("Fee"), row("Fee"), row("Other")]);
    expect(new Set(keys).size).toBe(3);
    expect(fingerprintKeys([row("Fee"), row("Fee"), row("Other")])).toEqual(keys);
  });
  it("ignores case in the description", () => {
    expect(fingerprintKeys([row("FEE")])).toEqual(fingerprintKeys([row("fee")]));
  });
});

const line = (
  id: string,
  date: string,
  amountMinor: number,
  reference?: string,
): StatementLineLite => ({
  id,
  date,
  amountMinor,
  description: "x",
  reference,
});
const posting = (
  lineId: string,
  entryDate: string,
  signedMinor: number,
  memo = "m",
): LedgerCandidate => ({
  lineId,
  entryNumber: `JE-${lineId}`,
  entryDate,
  memo,
  signedMinor,
});

describe("suggesting a posting", () => {
  it("wants the same amount in the same direction, within a week, nearest first", () => {
    const found = suggestMatches(line("s", "2026-10-10", 50_000), [
      posting("far", "2026-10-25", 50_000),
      posting("wrong-sign", "2026-10-10", -50_000),
      posting("wrong-amount", "2026-10-10", 50_001),
      posting("two-days", "2026-10-12", 50_000),
      posting("same-day", "2026-10-10", 50_000),
    ]);
    expect(found.map((c) => c.lineId)).toEqual(["same-day", "two-days"]);
  });
  it("prefers the one whose memo mentions the reference", () => {
    const found = suggestMatches(line("s", "2026-10-10", 50_000, "CHQ1042"), [
      posting("a", "2026-10-10", 50_000, "Rent"),
      posting("b", "2026-10-12", 50_000, "Cheque CHQ1042 to landlord"),
    ]);
    expect(found[0].lineId).toBe("b");
  });
});

describe("matching automatically", () => {
  it("pairs only what is certain both ways", () => {
    const pairs = autoMatch(
      [line("s1", "2026-10-10", 100), line("s2", "2026-10-10", 200), line("s3", "2026-10-10", 300)],
      [
        posting("p1", "2026-10-10", 100),
        posting("p2a", "2026-10-10", 200),
        posting("p2b", "2026-10-11", 200),
        posting("p3", "2026-10-10", 300),
      ],
    );
    expect(pairs).toEqual([
      { lineId: "s1", ledgerLineId: "p1" },
      { lineId: "s3", ledgerLineId: "p3" },
    ]);
  });
  it("won't give one posting to two lines", () => {
    expect(
      autoMatch(
        [line("s1", "2026-10-10", 100), line("s2", "2026-10-11", 100)],
        [posting("p1", "2026-10-10", 100)],
      ),
    ).toEqual([]);
  });
});

describe("signing off a period", () => {
  const ok = {
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    today: "2026-11-02",
    openingMinor: 1_000_000,
    closingMinor: 1_070_000,
    amounts: [100_000, -30_000],
    unresolved: 0,
    overlapsSignedOff: false,
  };
  it("passes when the lines add up to the closing balance and all are resolved", () => {
    expect(
      statementDifference({
        openingMinor: 1_000_000,
        closingMinor: 1_070_000,
        amounts: [100_000, -30_000],
      }),
    ).toBe(0);
    expect(checkSignOff(ok)).toBeNull();
  });
  it("says what is wrong", () => {
    expect(checkSignOff({ ...ok, unresolved: 2 })).toMatch(/2 lines are still unmatched/);
    expect(checkSignOff({ ...ok, closingMinor: 1_071_000 })).toMatch(/out by 10.00/);
    expect(checkSignOff({ ...ok, openingMinor: null })).toMatch(/balances/);
    expect(checkSignOff({ ...ok, amounts: [] })).toMatch(/No statement lines/);
    expect(checkSignOff({ ...ok, periodEnd: "2026-11-05" })).toMatch(/future/);
    expect(checkSignOff({ ...ok, periodEnd: "2026-09-01" })).toMatch(/before it starts/);
    expect(checkSignOff({ ...ok, overlapsSignedOff: true })).toMatch(/already/);
  });
});
