import { describe, expect, it } from "vitest";

import { billableMilli, buildTimeLines, checkRate, hoursText, resolveRate } from "./billing";

describe("which rate applies", () => {
  it("takes the most specific one that is set", () => {
    expect(resolveRate({ personOnProject: 900, project: 800, person: 700, default: 600 })).toEqual({
      rateMinor: 900,
      source: "personOnProject",
    });
    expect(resolveRate({ project: 800, person: 700, default: 600 })).toEqual({
      rateMinor: 800,
      source: "project",
    });
    expect(resolveRate({ person: 700, default: 600 })).toEqual({
      rateMinor: 700,
      source: "person",
    });
    expect(resolveRate({ default: 600 })).toEqual({ rateMinor: 600, source: "default" });
  });
  it("is nothing when nothing is set, and ignores a zero or empty rate", () => {
    expect(resolveRate({})).toBeNull();
    expect(resolveRate({ project: 0, person: null, default: undefined })).toBeNull();
    expect(resolveRate({ project: 0, default: 600 })?.source).toBe("default");
  });
});

describe("hours", () => {
  it("rounds to the hundredth of an hour", () => {
    expect(billableMilli(60)).toBe(1000);
    expect(billableMilli(100)).toBe(1670);
    expect(billableMilli(90)).toBe(1500);
    expect(billableMilli(0)).toBe(0);
    expect(billableMilli(2)).toBe(30);
    expect(billableMilli(3)).toBe(50);
  });
  it("reads as plain hours", () => {
    expect(hoursText(1670)).toBe("1.67");
    expect(hoursText(1500)).toBe("1.5");
    expect(hoursText(2000)).toBe("2");
    expect(hoursText(0)).toBe("0");
  });
});

const entry = (
  id: string,
  profileId: string,
  personName: string,
  minutes: number,
  workDate: string,
) => ({
  id,
  profileId,
  personName,
  minutes,
  workDate,
});

describe("an invoice for a batch of time", () => {
  const entries = [
    entry("e1", "maria", "Maria Santos", 240, "2026-10-01"),
    entry("e2", "maria", "Maria Santos", 270, "2026-10-05"),
    entry("e3", "jose", "Jose Reyes", 120, "2026-10-02"),
  ];

  it("makes one line per person: their hours at their rate", () => {
    const result = buildTimeLines({
      projectName: "Website",
      entries,
      rateFor: (id) =>
        id === "maria"
          ? { rateMinor: 150_000, source: "person" }
          : { rateMinor: 100_000, source: "default" },
    });
    expect(result.missing).toEqual([]);
    expect(result.totalMinutes).toBe(630);
    expect(result.lines.map((l) => l.personName)).toEqual(["Jose Reyes", "Maria Santos"]);
    const maria = result.lines[1];
    // 510 minutes is 8.5 hours at 1,500 an hour.
    expect(maria).toMatchObject({
      quantityMilli: 8500,
      unitPriceMinor: 150_000,
      amountMinor: 1_275_000,
      entryIds: ["e1", "e2"],
    });
    expect(maria.description).toBe("Website: Maria Santos, 1 October 2026 to 5 October 2026");
    expect(result.lines[0].description).toBe("Website: Jose Reyes, 2 October 2026");
  });

  it("lists people with no rate instead of leaving their time out silently", () => {
    const result = buildTimeLines({
      projectName: "Website",
      entries,
      rateFor: (id) => (id === "maria" ? { rateMinor: 150_000, source: "person" } : null),
    });
    expect(result.lines).toHaveLength(1);
    expect(result.missing).toEqual([{ profileId: "jose", personName: "Jose Reyes" }]);
  });
});

describe("a rate", () => {
  it("must be a sensible amount", () => {
    expect(checkRate(150_000)).toBeNull();
    expect(checkRate(0)).toMatch(/above zero/);
    expect(checkRate(-5)).toMatch(/above zero/);
    expect(checkRate(200_000_000)).toMatch(/too high/);
  });
});
