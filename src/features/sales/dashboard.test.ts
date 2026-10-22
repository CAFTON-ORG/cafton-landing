import { describe, expect, it } from "vitest";

import {
  attainmentPct,
  isMonth,
  monthOf,
  monthRange,
  salesMetrics,
  shiftMonth,
  winRatePct,
  type MetricDeal,
} from "./dashboard";

const at = (value: string) => new Date(value);
const NOW = at("2026-11-20T04:00:00Z");

const deal = (over: Partial<MetricDeal>): MetricDeal => ({
  ownerId: "ana",
  stageKind: "open",
  probability: 50,
  amountMinor: 100_000_00,
  createdAt: at("2026-10-01T00:00:00Z"),
  wonAt: null,
  lostAt: null,
  ...over,
});

describe("months in Manila time", () => {
  it("reads the month a moment falls in", () => {
    expect(monthOf(at("2026-10-31T15:59:00Z"))).toBe("2026-10");
    // 16:00 UTC is midnight in Manila: already November there.
    expect(monthOf(at("2026-10-31T16:00:00Z"))).toBe("2026-11");
  });

  it("gives the range and steps across a year end", () => {
    const { start, end } = monthRange("2026-12");
    expect(start.toISOString()).toBe("2026-11-30T16:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-31T16:00:00.000Z");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("validates a month", () => {
    expect(isMonth("2026-11")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth(undefined)).toBe(false);
  });
});

describe("rates", () => {
  it("works out win rate and attainment", () => {
    expect(winRatePct(3, 1)).toBe(75);
    expect(winRatePct(0, 0)).toBeNull();
    expect(attainmentPct(50, 200)).toBe(25);
    expect(attainmentPct(50, null)).toBeNull();
    expect(attainmentPct(50, 0)).toBeNull();
  });
});

describe("salesMetrics", () => {
  const targets = new Map([
    ["ana", 200_000_00],
    ["ben", 100_000_00],
  ]);

  it("values the open pipeline and weights it by stage chance", () => {
    const m = salesMetrics(
      [deal({}), deal({ probability: 20, amountMinor: 50_000_00 }), deal({ amountMinor: null })],
      targets,
      { month: "2026-11", now: NOW },
    );
    expect(m.open).toEqual({ count: 3, valueMinor: 150_000_00, weightedMinor: 60_000_00 });
  });

  it("counts wins and losses in the window, with cycle time and win rate", () => {
    const m = salesMetrics(
      [
        deal({ stageKind: "won", wonAt: at("2026-11-11T00:00:00Z") }), // 41 days
        deal({
          stageKind: "won",
          wonAt: at("2026-10-21T00:00:00Z"),
          createdAt: at("2026-10-01T00:00:00Z"),
        }), // 20 days
        deal({ stageKind: "lost", lostAt: at("2026-11-02T00:00:00Z") }),
        deal({ stageKind: "lost", lostAt: at("2026-01-02T00:00:00Z") }), // outside the window
      ],
      targets,
      { month: "2026-11", now: NOW },
    );
    expect(m.decided).toMatchObject({ won: 2, lost: 1, winRatePct: 67, cycleDays: 30.5 });
  });

  it("measures each person against their target for the month", () => {
    const m = salesMetrics(
      [
        deal({ stageKind: "won", wonAt: at("2026-11-05T00:00:00Z"), amountMinor: 50_000_00 }),
        deal({ stageKind: "won", wonAt: at("2026-10-05T00:00:00Z") }), // last month
        deal({ ownerId: "ben", stageKind: "won", wonAt: at("2026-11-06T00:00:00Z") }),
        deal({ ownerId: null }),
      ],
      targets,
      { month: "2026-11", now: NOW },
    );
    const ana = m.owners.find((o) => o.ownerId === "ana");
    expect(ana).toMatchObject({ wonMinor: 50_000_00, targetMinor: 200_000_00, attainmentPct: 25 });
    expect(m.owners.find((o) => o.ownerId === "ben")?.attainmentPct).toBe(100);
    expect(m.owners.at(-1)?.ownerId).toBeNull();
    expect(m.month).toMatchObject({
      wonMinor: 150_000_00,
      targetMinor: 300_000_00,
      attainmentPct: 50,
    });
  });

  it("lists people with a target even before they have deals", () => {
    const m = salesMetrics([], targets, { month: "2026-11", now: NOW });
    expect(m.owners.map((o) => o.ownerId).sort()).toEqual(["ana", "ben"]);
    expect(m.decided.winRatePct).toBeNull();
    expect(m.decided.cycleDays).toBeNull();
  });
});
