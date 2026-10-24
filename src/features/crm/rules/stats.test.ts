import { describe, expect, it } from "vitest";

import { pipelineStats, type StatDeal } from "./stats";

const stages = [
  { id: "new", probability: 10 },
  { id: "proposal", probability: 50 },
  { id: "won", probability: 100 },
];
const deal = (over: Partial<StatDeal>): StatDeal => ({
  stageId: "new",
  stageKind: "open",
  amountMinor: 0,
  ...over,
});

describe("pipelineStats", () => {
  it("counts only open deals and weights them by their stage", () => {
    const result = pipelineStats(
      stages,
      [
        deal({ stageId: "new", amountMinor: 100_000_00 }),
        deal({ stageId: "proposal", amountMinor: 200_000_00 }),
        deal({ stageId: "won", stageKind: "won", amountMinor: 999_000_00 }),
      ],
      "2026-10-22",
    );
    expect(result.count).toBe(2);
    expect(result.valueMinor).toBe(300_000_00);
    expect(result.weightedMinor).toBe(10_000_00 + 100_000_00);
  });

  it("treats a missing value as zero and a missing stage as no chance", () => {
    const result = pipelineStats(
      stages,
      [deal({ amountMinor: null }), deal({ stageId: "x", amountMinor: 5000 })],
      "2026-10-22",
    );
    expect(result.valueMinor).toBe(5000);
    expect(result.weightedMinor).toBe(0);
  });

  it("flags deals with nothing planned and deals past their close date", () => {
    const result = pipelineStats(
      stages,
      [
        deal({ nextActivityAt: "2026-10-30T00:00:00Z", expectedCloseDate: "2026-10-22" }),
        deal({ expectedCloseDate: "2026-10-21" }),
        deal({ stageKind: "lost", expectedCloseDate: "2020-01-01" }),
      ],
      "2026-10-22",
    );
    expect(result.withoutNextStep).toBe(1);
    expect(result.pastCloseDate).toBe(1); // today is not yet late; a closed deal never is
  });
});
