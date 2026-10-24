import { describe, expect, it } from "vitest";

import {
  fingerprint,
  generateToken,
  hashToken,
  TOKEN_SHAPE,
  type Fingerprinted,
} from "./integrity";

const base: Fingerprinted = {
  title: "Inventory",
  intro: "Hello",
  terms: "Pay half",
  paymentTerms: "Bank transfer",
  depositPct: 50,
  validUntil: "2026-11-30",
  currency: "PHP",
  taxRatePct: 12,
  subtotalMinor: 100_00,
  taxMinor: 12_00,
  totalMinor: 112_00,
  lines: [
    {
      position: 2,
      description: "B",
      quantityMilli: 1000,
      unitLabel: "hour",
      unitPriceMinor: 50_00,
      discountPct: 0,
      taxable: true,
      totalMinor: 50_00,
    },
    {
      position: 1,
      description: "A",
      quantityMilli: 1000,
      unitLabel: "project",
      unitPriceMinor: 50_00,
      discountPct: 0,
      taxable: true,
      totalMinor: 50_00,
    },
  ],
};

describe("links", () => {
  it("makes long unguessable tokens and stores only their hash", () => {
    const a = generateToken();
    expect(a).toMatch(TOKEN_SHAPE);
    expect(a).toHaveLength(43);
    expect(generateToken()).not.toBe(a);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).not.toContain(a);
    expect(hashToken(a)).toBe(hashToken(a));
  });
});

describe("fingerprint", () => {
  it("is the same for the same content, whatever order the lines arrive in", () => {
    expect(fingerprint(base)).toBe(fingerprint({ ...base, lines: [...base.lines].reverse() }));
    expect(fingerprint(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when anything the client agrees to changes", () => {
    const original = fingerprint(base);
    expect(fingerprint({ ...base, totalMinor: base.totalMinor + 1 })).not.toBe(original);
    expect(fingerprint({ ...base, terms: "Pay all" })).not.toBe(original);
    expect(fingerprint({ ...base, depositPct: 30 })).not.toBe(original);
    expect(fingerprint({ ...base, validUntil: "2026-12-01" })).not.toBe(original);
    expect(
      fingerprint({ ...base, lines: [{ ...base.lines[0], description: "C" }, base.lines[1]] }),
    ).not.toBe(original);
  });

  it("treats a missing value and an empty one alike", () => {
    expect(fingerprint({ ...base, intro: null })).toBe(fingerprint({ ...base, intro: "" }));
  });
});
