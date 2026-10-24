import { describe, expect, it } from "vitest";

import { monthGrid, shiftMonth, startOfWeek, weekDays } from "./calendar";

describe("calendar layout", () => {
  it("fills whole Sunday-first weeks around a month", () => {
    const grid = monthGrid("2026-10-22");
    expect(grid[0]).toBe("2026-09-27");
    expect(grid.at(-1)).toBe("2026-10-31");
    expect(grid.length % 7).toBe(0);
  });

  it("finds the week of a day", () => {
    expect(startOfWeek("2026-10-22")).toBe("2026-10-18");
    expect(weekDays("2026-10-22")).toHaveLength(7);
  });

  it("moves between months across a year end", () => {
    expect(shiftMonth("2026-12-15", 1)).toBe("2027-01-01");
    expect(shiftMonth("2026-01-31", -1)).toBe("2025-12-01");
  });
});
