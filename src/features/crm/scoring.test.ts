import { describe, expect, it } from "vitest";

import {
  budgetRanges,
  businessSizes,
  positions,
  referralSources,
  timelines,
} from "./contact-options";
import { BAND_FLOOR, bandOf, bandRange, scoreLead } from "./scoring";

const strong = {
  budget: "₱500,000+",
  timeline: "As soon as possible",
  phone: "0917 555 0000",
  email: "owner@acme.ph",
  businessName: "Acme",
  answers: {
    businessSize: "51-200 employees",
    position: "Owner / Founder",
    referralSource: "Existing client",
  },
};

describe("scoreLead", () => {
  it("scores a ready, well-funded enquiry as hot, and explains every point", () => {
    const result = scoreLead(strong);
    expect(result.band).toBe("hot");
    expect(result.score).toBe(30 + 25 + 11 + 10 + 8 + 4 + 4 + 4);
    expect(result.reasons.reduce((sum, reason) => sum + reason.points, 0)).toBe(result.score);
    // Biggest reason first.
    expect(result.reasons[0]).toMatchObject({ label: "Budget: ₱500,000+", points: 30 });
  });

  it("scores someone just exploring with no budget as cold", () => {
    const result = scoreLead({
      budget: "Not sure yet",
      timeline: "Just exploring for now",
      email: "someone@gmail.com",
      answers: { businessSize: "Just me", position: "Employee" },
    });
    expect(result.band).toBe("cold");
    expect(result.score).toBeLessThan(BAND_FLOOR.warm);
  });

  it("never exceeds 100, and scores an empty enquiry zero without failing", () => {
    expect(scoreLead(strong).score).toBeLessThanOrEqual(100);
    const empty = scoreLead({ email: "" });
    expect(empty).toEqual({ score: 0, band: "cold", reasons: [] });
  });

  it("ignores answers it doesn't recognise instead of guessing", () => {
    const result = scoreLead({
      budget: "a lot",
      timeline: "someday",
      email: "x@gmail.com",
      answers: { businessSize: 12, position: null },
    });
    expect(result.score).toBe(0);
  });

  it("treats a free email address as no signal and a work address as a small one", () => {
    const free = scoreLead({ email: "a@GMAIL.com" }).score;
    const work = scoreLead({ email: "a@acme.ph" }).score;
    expect(work - free).toBe(4);
  });

  it("covers every option the contact form offers, so a new option can't silently score zero", () => {
    // If the form gains an option, the score tables must be updated: a lone zero here is a prompt.
    for (const budget of budgetRanges)
      expect(scoreLead({ email: "", budget }).score).toBeGreaterThan(0);
    for (const timeline of timelines)
      expect(scoreLead({ email: "", timeline }).score).toBeGreaterThan(0);
    for (const businessSize of businessSizes) {
      expect(scoreLead({ email: "", answers: { businessSize } }).score).toBeGreaterThan(0);
    }
    for (const position of positions) {
      expect(scoreLead({ email: "", answers: { position } }).score).toBeGreaterThan(0);
    }
    // Only some referral sources earn points; the rest are deliberately neutral.
    expect(
      referralSources.some(
        (referralSource) => scoreLead({ email: "", answers: { referralSource } }).score > 0,
      ),
    ).toBe(true);
  });
});

describe("bands", () => {
  it("splits at the floors", () => {
    expect(bandOf(BAND_FLOOR.hot)).toBe("hot");
    expect(bandOf(BAND_FLOOR.hot - 1)).toBe("warm");
    expect(bandOf(BAND_FLOOR.warm)).toBe("warm");
    expect(bandOf(BAND_FLOOR.warm - 1)).toBe("cold");
  });

  it("gives database ranges that agree with bandOf at every score", () => {
    for (let score = 0; score <= 100; score += 1) {
      const band = bandOf(score);
      const { min = -Infinity, max = Infinity } = bandRange(band);
      expect(score >= min && score < max).toBe(true);
    }
  });
});
