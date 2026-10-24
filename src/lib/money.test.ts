import { describe, expect, it } from "vitest";

import { formatMinor, minorToInput, parseMinor, weightedMinor } from "./money";

describe("parseMinor", () => {
  it("converts decimal text to integer minor units without floating point", () => {
    expect(parseMinor("12,500.50")).toBe(1250050);
    expect(parseMinor("₱ 0.10")).toBe(10);
    expect(parseMinor("19.99")).toBe(1999);
    expect(parseMinor("100")).toBe(10000);
    expect(parseMinor("5.5")).toBe(550);
  });

  it("rejects negatives, extra decimals, junk and unsafe sizes", () => {
    expect(parseMinor("-5")).toBeNull();
    expect(parseMinor("1.234")).toBeNull();
    expect(parseMinor("abc")).toBeNull();
    expect(parseMinor("")).toBeNull();
    expect(parseMinor("99999999999999999999")).toBeNull();
  });

  it("honours zero-decimal currencies", () => {
    expect(parseMinor("1500", "JPY")).toBe(1500);
    expect(parseMinor("15.5", "JPY")).toBeNull();
  });
});

describe("formatMinor", () => {
  it("formats pesos and handles missing values", () => {
    expect(formatMinor(1250050)).toBe("₱12,500.50");
    expect(formatMinor(null)).toBe("—");
    expect(formatMinor(1250000, "PHP", { compact: true })).toBe("₱12,500");
    expect(formatMinor(1250050, "PHP", { compact: true })).toBe("₱12,500.50");
  });
});

describe("minorToInput", () => {
  it("round-trips with parseMinor", () => {
    expect(minorToInput(1250050)).toBe("12500.50");
    expect(parseMinor(minorToInput(1250050))).toBe(1250050);
    expect(minorToInput(null)).toBe("");
  });
});

describe("weightedMinor", () => {
  it("weights each deal by its stage probability", () => {
    expect(
      weightedMinor([
        { amountMinor: 100000, probability: 50 },
        { amountMinor: 200000, probability: 25 },
        { amountMinor: null, probability: 90 },
      ]),
    ).toBe(100000);
  });
});
