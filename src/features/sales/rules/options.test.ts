import { describe, expect, it } from "vitest";

import {
  DEPOSITS,
  DISCOUNTS,
  PAYMENT_WORDINGS,
  UNITS,
  VALID_FOR_DAYS,
  discountLabel,
} from "./options";
import { MAX_DISCOUNT_PCT_WITHOUT_APPROVAL, MAX_VALID_DAYS } from "./core";

describe("quote option lists", () => {
  it("never offer a validity longer than a quote may stay open", () => {
    expect(Math.max(...VALID_FOR_DAYS)).toBeLessThanOrEqual(MAX_VALID_DAYS);
  });

  it("keep percentages within 0 to 100 and sorted", () => {
    for (const list of [DISCOUNTS, DEPOSITS]) {
      const numbers = list.map(Number);
      expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...numbers)).toBeLessThanOrEqual(100);
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    }
  });

  it("have no repeated units or wording names", () => {
    expect(new Set(UNITS).size).toBe(UNITS.length);
    expect(new Set(PAYMENT_WORDINGS.map((w) => w.name)).size).toBe(PAYMENT_WORDINGS.length);
  });
});

describe("discountLabel", () => {
  it("flags only the percents above the approval limit", () => {
    expect(discountLabel(String(MAX_DISCOUNT_PCT_WITHOUT_APPROVAL))).toBe(
      String(MAX_DISCOUNT_PCT_WITHOUT_APPROVAL),
    );
    expect(discountLabel(String(MAX_DISCOUNT_PCT_WITHOUT_APPROVAL + 5))).toContain(
      "needs approval",
    );
  });
});
