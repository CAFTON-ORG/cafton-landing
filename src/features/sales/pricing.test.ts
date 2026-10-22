import { describe, expect, it } from "vitest";

import { lineTotal, parseQuantity, quantityText, quoteTotals } from "./pricing";

describe("lineTotal", () => {
  it("multiplies price by quantity and applies the discount", () => {
    expect(lineTotal({ unitPriceMinor: 100_000_00, quantityMilli: 1000, discountPct: 0 })).toBe(
      100_000_00,
    );
    expect(lineTotal({ unitPriceMinor: 1_500_00, quantityMilli: 2500, discountPct: 0 })).toBe(
      3_750_00,
    );
    expect(lineTotal({ unitPriceMinor: 200_00, quantityMilli: 1000, discountPct: 25 })).toBe(
      150_00,
    );
  });

  it("rounds half up to the centavo", () => {
    expect(lineTotal({ unitPriceMinor: 1, quantityMilli: 500, discountPct: 0 })).toBe(1);
    expect(lineTotal({ unitPriceMinor: 333, quantityMilli: 1000, discountPct: 50 })).toBe(167);
  });

  it("does not lose precision on very large amounts", () => {
    expect(
      lineTotal({ unitPriceMinor: 99_999_999_999, quantityMilli: 1_000_000, discountPct: 0 }),
    ).toBe(99_999_999_999_000);
  });
});

describe("quoteTotals", () => {
  const line = (price: number, taxable = true) => ({
    unitPriceMinor: price,
    quantityMilli: 1000,
    discountPct: 0,
    taxable,
  });

  it("adds VAT on taxable lines only and always adds up", () => {
    const result = quoteTotals([line(100_000_00), line(50_000_00, false)], 12);
    expect(result.subtotalMinor).toBe(150_000_00);
    expect(result.taxMinor).toBe(12_000_00);
    expect(result.totalMinor).toBe(result.subtotalMinor + result.taxMinor);
  });

  it("is zero for no lines", () => {
    expect(quoteTotals([], 12)).toEqual({ subtotalMinor: 0, taxMinor: 0, totalMinor: 0 });
  });

  it("rounds the tax once on the taxable total, not per line", () => {
    // 0.99 x 12% = 0.1188, so 12 centavos; rounding each 0.33 line would give 4 + 4 + 4 = 12 too,
    // but 0.34 lines would differ: the tax is on the total.
    expect(quoteTotals([line(33), line(33), line(33)], 12).taxMinor).toBe(12);
    expect(quoteTotals([line(4), line(4)], 12).taxMinor).toBe(1); // 8 x 12% = 0.96 -> 1, not 0 + 0
  });
});

describe("quantities", () => {
  it("reads and writes thousandths", () => {
    expect(parseQuantity("1.5")).toBe(1500);
    expect(parseQuantity("2")).toBe(2000);
    expect(parseQuantity("0.001")).toBe(1);
    expect(quantityText(1500)).toBe("1.5");
    expect(quantityText(2000)).toBe("2");
  });

  it("rejects zero, negatives, too many decimals and absurd sizes", () => {
    for (const bad of ["0", "-1", "1.2345", "abc", "", "1001"]) {
      expect(parseQuantity(bad)).toBeNull();
    }
  });
});
