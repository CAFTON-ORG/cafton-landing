import { describe, expect, it } from "vitest";

import {
  buildBalanceSheet,
  buildCashFlow,
  buildProfitAndLoss,
  buildTaxSummary,
  buildTrialBalance,
  cashGroup,
  longDate,
  netIncomeOf,
  reportToCsv,
  type AccountTotals,
  type ReportSpec,
} from "./reports";

const acc = (
  code: string,
  name: string,
  type: AccountTotals["type"],
  debitMinor: number,
  creditMinor: number,
  systemKey?: string,
): AccountTotals => ({ code, name, type, debitMinor, creditMinor, systemKey });

/** A year of trading: 60k capital, 50k earned, 10k spent, 5k of it as income tax, 20k still owed by a client. */
const books = [
  acc("1010", "Cash in bank", "asset", 90_000_00, 5_000_00 + 5_000_00, "bank"),
  acc("1100", "Accounts receivable", "asset", 20_000_00, 0, "ar"),
  acc("3000", "Owner's capital", "equity", 0, 60_000_00),
  acc("4000", "Service revenue", "revenue", 0, 50_000_00, "revenue_services"),
  acc("6300", "Software", "expense", 5_000_00, 0),
  acc("6900", "Income tax expense", "expense", 5_000_00, 0, "income_tax_expense"),
];

const rowsOf = (spec: ReportSpec) => spec.sections.flatMap((section) => section.rows);
const find = (spec: ReportSpec, label: string) => rowsOf(spec).find((row) => row.label === label);

describe("profit and loss", () => {
  const spec = buildProfitAndLoss(books, "2026-01-01", "2026-10-23");
  it("adds income, expenses and tax up to net income", () => {
    expect(find(spec, "Total income")?.amounts).toEqual([50_000_00]);
    expect(find(spec, "Total expenses")?.amounts).toEqual([5_000_00]);
    expect(find(spec, "Profit before income tax")?.amounts).toEqual([45_000_00]);
    expect(find(spec, "Net income")?.amounts).toEqual([40_000_00]);
    expect(netIncomeOf(books)).toBe(40_000_00);
  });
  it("leaves out accounts with nothing in them and says what period it covers", () => {
    expect(rowsOf(spec).some((row) => row.code === "1010")).toBe(false);
    expect(spec.subtitle).toBe("1 January 2026 to 23 October 2026");
  });
});

describe("balance sheet", () => {
  it("balances, with the year's earnings in equity", () => {
    const spec = buildBalanceSheet(books, [], "2026-10-23");
    expect(find(spec, "Total assets")?.amounts).toEqual([100_000_00]);
    expect(find(spec, "Earnings this year")?.amounts).toEqual([40_000_00]);
    expect(find(spec, "Total equity")?.amounts).toEqual([100_000_00]);
    expect(find(spec, "Liabilities and equity")?.amounts).toEqual(
      find(spec, "Total assets")?.amounts,
    );
    expect(rowsOf(spec).some((row) => row.kind === "note")).toBe(false);
  });

  it("tells earlier years' earnings from this year's", () => {
    const lastYear = [
      acc("4000", "Service revenue", "revenue", 0, 30_000_00),
      acc("6300", "Software", "expense", 10_000_00, 0),
    ];
    const cumulative = [
      acc("1010", "Cash in bank", "asset", 80_000_00, 0),
      acc("3000", "Owner's capital", "equity", 0, 40_000_00),
      acc("4000", "Service revenue", "revenue", 0, 50_000_00),
      acc("6300", "Software", "expense", 10_000_00, 0),
    ];
    const spec = buildBalanceSheet(cumulative, lastYear, "2026-10-23");
    expect(find(spec, "Earnings from earlier years")?.amounts).toEqual([20_000_00]);
    expect(find(spec, "Earnings this year")?.amounts).toEqual([20_000_00]);
    expect(find(spec, "Total assets")?.amounts).toEqual(
      find(spec, "Liabilities and equity")?.amounts,
    );
  });

  it("flags a sheet that does not balance", () => {
    const off = [acc("1010", "Cash", "asset", 100, 0), acc("3000", "Capital", "equity", 0, 90)];
    expect(
      rowsOf(buildBalanceSheet(off, [], "2026-10-23")).some((row) => row.kind === "note"),
    ).toBe(true);
  });
});

describe("trial balance", () => {
  it("puts each balance on its own side and the sides add up equal", () => {
    const spec = buildTrialBalance(books, "2026-10-23");
    const total = find(spec, "Total");
    expect(total?.amounts?.[0]).toBe(total?.amounts?.[1]);
    expect(find(spec, "Cash in bank")?.amounts).toEqual([80_000_00, null]);
    expect(find(spec, "Owner's capital")?.amounts).toEqual([null, 60_000_00]);
    expect(spec.columns).toEqual(["Debit", "Credit"]);
  });
});

describe("cash flow", () => {
  it("groups movements by what was on the other side, and adds up to the closing cash", () => {
    expect(cashGroup("asset", "ar")).toBe("customers");
    expect(cashGroup("expense")).toBe("suppliers");
    expect(cashGroup("equity")).toBe("owner");
    expect(cashGroup("liability", "withholding_payable")).toBe("taxes");
    expect(cashGroup("asset", "cwt_receivable")).toBe("withheld");

    const spec = buildCashFlow({
      movements: [
        {
          code: "1100",
          name: "Accounts receivable",
          type: "asset",
          systemKey: "ar",
          amountMinor: 30_000_00,
        },
        {
          code: "1200",
          name: "Creditable withholding tax",
          type: "asset",
          systemKey: "cwt_receivable",
          amountMinor: -1_000_00,
        },
        { code: "6300", name: "Software", type: "expense", amountMinor: -5_000_00 },
        { code: "3000", name: "Owner's capital", type: "equity", amountMinor: 60_000_00 },
      ],
      openingMinor: 0,
      closingMinor: 84_000_00,
      from: "2026-01-01",
      to: "2026-10-23",
    });
    expect(find(spec, "Net cash from operations")?.amounts).toEqual([24_000_00]);
    expect(find(spec, "Net cash from the owner")?.amounts).toEqual([60_000_00]);
    expect(find(spec, "Net change in cash")?.amounts).toEqual([84_000_00]);
    expect(find(spec, "Cash at the end")?.amounts).toEqual([84_000_00]);
    expect(
      rowsOf(spec).some((row) => row.kind === "note" && /different amount/.test(row.label)),
    ).toBe(false);
  });

  it("says so when the cash accounts hold something else", () => {
    const spec = buildCashFlow({
      movements: [{ code: "6300", name: "Software", type: "expense", amountMinor: -100 }],
      openingMinor: 1_000,
      closingMinor: 5,
      from: "2026-01-01",
      to: "2026-01-31",
    });
    expect(rowsOf(spec).some((row) => /different amount/.test(row.label))).toBe(true);
  });
});

describe("tax summary", () => {
  it("shows gross receipts and the tax held by and from others", () => {
    const spec = buildTaxSummary(
      [
        acc("4000", "Service revenue", "revenue", 0, 300_000_00, "revenue_services"),
        acc("1200", "Creditable withholding tax", "asset", 6_000_00, 0, "cwt_receivable"),
        acc(
          "2110",
          "Withholding tax payable",
          "liability",
          1_000_00,
          3_000_00,
          "withholding_payable",
        ),
      ],
      "2026-01-01",
      "2026-12-31",
    );
    expect(find(spec, "Gross receipts and sales")?.amounts).toEqual([300_000_00]);
    expect(find(spec, "Creditable withholding tax claimed in the period")?.amounts).toEqual([
      6_000_00,
    ]);
    expect(find(spec, "Withheld in the period")?.amounts).toEqual([3_000_00]);
    expect(find(spec, "Paid over in the period")?.amounts).toEqual([1_000_00]);
    expect(find(spec, "Output VAT charged in the period")?.amounts).toEqual([0]);
  });
});

describe("exporting", () => {
  it("writes a CSV with the codes, figures in pesos and no commentary rows", () => {
    const csv = reportToCsv(buildProfitAndLoss(books, "2026-01-01", "2026-10-23"));
    expect(csv).toContain("Section,Profit and loss,Amount");
    expect(csv).toContain("Income,4000 Service revenue,50000.00");
    expect(csv).toContain(",Net income,40000.00");
    expect(csv.split("\r\n").length).toBeGreaterThan(5);
  });
  it("keeps both columns of a trial balance", () => {
    const csv = reportToCsv(buildTrialBalance(books, "2026-10-23"));
    expect(csv).toContain("Section,Trial balance,Debit,Credit");
    expect(csv).toContain("1010 Cash in bank,80000.00,");
  });
  it("writes dates the way people read them", () =>
    expect(longDate("2026-01-05")).toBe("5 January 2026"));
});
