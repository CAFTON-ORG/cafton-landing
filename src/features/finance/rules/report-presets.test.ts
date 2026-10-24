import { describe, expect, it } from "vitest";

import { asOfPresets, periodPresets } from "./report-presets";

describe("report date presets", () => {
  it("works out periods from today", () => {
    const presets = Object.fromEntries(periodPresets("2026-11-15").map((p) => [p.label, p.params]));
    expect(presets["This month"]).toEqual({ from: "2026-11-01", to: "2026-11-15" });
    expect(presets["This quarter"]).toEqual({ from: "2026-10-01", to: "2026-11-15" });
    expect(presets["This year"]).toEqual({ from: "2026-01-01", to: "2026-11-15" });
    expect(presets["Last year"]).toEqual({ from: "2025-01-01", to: "2025-12-31" });
  });
  it("starts the first quarter in January", () => {
    expect(periodPresets("2026-03-31")[1].params.from).toBe("2026-01-01");
    expect(periodPresets("2026-04-01")[1].params.from).toBe("2026-04-01");
  });
  it("works out as-of days, across a year end", () => {
    const presets = Object.fromEntries(
      asOfPresets("2027-01-10").map((p) => [p.label, p.params.asOf]),
    );
    expect(presets["Today"]).toBe("2027-01-10");
    expect(presets["End of last month"]).toBe("2026-12-31");
    expect(presets["End of last year"]).toBe("2026-12-31");
  });
});
