import { describe, expect, it } from "vitest";

import {
  barWidth,
  count,
  firstName,
  greeting,
  hoursAndMinutes,
  longManilaDate,
  manilaHour,
  rankAttention,
} from "./core";

describe("greeting someone", () => {
  it("follows the time of day", () => {
    expect(greeting(0)).toBe("Good morning");
    expect(greeting(11)).toBe("Good morning");
    expect(greeting(12)).toBe("Good afternoon");
    expect(greeting(17)).toBe("Good afternoon");
    expect(greeting(18)).toBe("Good evening");
    expect(greeting(23)).toBe("Good evening");
  });

  it("uses Manila time, not the server's", () => {
    // 22:00 UTC is 6 in the morning the next day in Manila.
    expect(manilaHour(new Date("2026-10-23T22:00:00Z"))).toBe(6);
    expect(manilaHour(new Date("2026-10-23T04:30:00Z"))).toBe(12);
  });

  it("reads the date the way people say it", () => {
    expect(longManilaDate(new Date("2026-10-24T02:00:00Z"))).toBe("Saturday, 24 October 2026");
  });

  it("takes the first word of a name", () => {
    expect(firstName("Christian Dela Cruz")).toBe("Christian");
    expect(firstName("  Maria ")).toBe("Maria");
    expect(firstName("")).toBe("there");
  });
});

describe("ordering what needs attention", () => {
  const item = (id: string, tone: "danger" | "warning" | "neutral") => ({ id, tone });
  it("puts the pressing first and keeps the given order within a level", () => {
    const ranked = rankAttention([
      item("a", "neutral"),
      item("b", "danger"),
      item("c", "warning"),
      item("d", "danger"),
      item("e", "neutral"),
    ]);
    expect(ranked.map((i) => i.id)).toEqual(["b", "d", "c", "a", "e"]);
  });
  it("stops at the limit", () => {
    const many = Array.from({ length: 12 }, (_, i) => item(String(i), "neutral"));
    expect(rankAttention(many, 5)).toHaveLength(5);
    expect(rankAttention(many)).toHaveLength(8);
  });
});

describe("saying numbers", () => {
  it("pluralises", () => {
    expect(count(1, "invoice")).toBe("1 invoice");
    expect(count(3, "invoice")).toBe("3 invoices");
    expect(count(2, "enquiry", "enquiries")).toBe("2 enquiries");
  });
  it("writes hours and minutes", () => {
    expect(hoursAndMinutes(0)).toBe("0m");
    expect(hoursAndMinutes(45)).toBe("45m");
    expect(hoursAndMinutes(390)).toBe("6h 30m");
    expect(hoursAndMinutes(2400)).toBe("40h");
  });
  it("sizes a bar: proportional, visible when there is something, never past full", () => {
    expect(barWidth(50, 100)).toBe(50);
    expect(barWidth(1, 1000)).toBe(3);
    expect(barWidth(0, 100)).toBe(0);
    expect(barWidth(10, 0)).toBe(0);
    expect(barWidth(500, 100)).toBe(100);
  });
});
