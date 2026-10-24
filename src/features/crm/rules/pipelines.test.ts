import { describe, expect, it } from "vitest";

import {
  checkDeletePipeline,
  checkStageRequirements,
  missingStageFields,
  normalizeRequiredFields,
  stageFieldChoices,
  type DealFacts,
  checkDeleteStage,
  moveWithin,
  orderedIds,
  slugKey,
  uniqueKey,
} from "./pipelines";

const stages = [
  { id: "a", kind: "open" as const },
  { id: "b", kind: "open" as const },
  { id: "c", kind: "open" as const },
  { id: "w", kind: "won" as const },
  { id: "l", kind: "lost" as const },
];

describe("pipeline keys", () => {
  it("makes a short address-safe name", () => {
    expect(slugKey("Follow up!  (2nd)")).toBe("follow-up-2nd");
    expect(slugKey("???")).toBe("stage");
  });

  it("never repeats a key", () => {
    expect(uniqueKey("won", new Set(["won", "won-2"]))).toBe("won-3");
    expect(uniqueKey("new", new Set())).toBe("new");
  });
});

describe("stage order", () => {
  it("keeps Won and Lost last", () => {
    expect(orderedIds([stages[3], stages[0], stages[4], stages[1]])).toEqual(["a", "b", "w", "l"]);
  });

  it("moves an open stage within the open ones only", () => {
    expect(moveWithin(stages, "b", "up")).toEqual(["b", "a", "c", "w", "l"]);
    expect(moveWithin(stages, "a", "up")).toBeNull();
    expect(moveWithin(stages, "c", "down")).toBeNull();
    expect(moveWithin(stages, "w", "up")).toBeNull();
  });
});

describe("deleting", () => {
  it("protects Won, Lost, busy stages and the last open stage", () => {
    expect(checkDeleteStage({ kind: "won", dealCount: 0 }, 3)).toMatch(/Won and Lost/);
    expect(checkDeleteStage({ kind: "open", dealCount: 2 }, 3)).toMatch(/2 deals are/);
    expect(checkDeleteStage({ kind: "open", dealCount: 0 }, 1)).toMatch(/at least one/);
    expect(checkDeleteStage({ kind: "open", dealCount: 0 }, 3)).toBeNull();
  });

  it("protects the default and busy pipelines", () => {
    expect(checkDeletePipeline({ isDefault: true, dealCount: 0 })).toMatch(/default/);
    expect(checkDeletePipeline({ isDefault: false, dealCount: 1 })).toMatch(/1 deal is/);
    expect(checkDeletePipeline({ isDefault: false, dealCount: 0 })).toBeNull();
  });
});

describe("required fields per stage", () => {
  const choices = stageFieldChoices([
    { key: "region", label: "Region", type: "select", active: true },
    { key: "vip", label: "VIP", type: "checkbox", active: true },
    { key: "old", label: "Old", type: "text", active: false },
  ]);
  const deal = (over: Partial<DealFacts> = {}): DealFacts => ({
    amountMinor: null,
    hasExpectedClose: false,
    hasOrganization: false,
    custom: {},
    ...over,
  });

  it("offers the built-in fields and the active, fillable custom ones", () => {
    expect(choices.map((choice) => choice.token)).toEqual([
      "value",
      "expected_close",
      "organization",
      "custom:region",
    ]);
  });

  it("drops anything that isn't an offered field", () => {
    expect(
      normalizeRequiredFields(["custom:region", "bogus", "value", "custom:old"], choices),
    ).toEqual(["value", "custom:region"]);
  });

  it("names what the deal is still missing", () => {
    const required = ["value", "expected_close", "organization", "custom:region"];
    expect(missingStageFields(required, deal(), choices)).toEqual([
      "Value",
      "Expected close date",
      "Organization",
      "Region",
    ]);
    expect(
      missingStageFields(
        required,
        deal({
          amountMinor: 5000,
          hasExpectedClose: true,
          hasOrganization: true,
          custom: { region: "North" },
        }),
        choices,
      ),
    ).toEqual([]);
    // A zero value is not a value; a field that no longer exists is not asked for.
    expect(missingStageFields(["value", "custom:gone"], deal({ amountMinor: 0 }), choices)).toEqual(
      ["Value"],
    );
  });

  it("explains in plain words", () => {
    expect(checkStageRequirements("Proposal", [])).toBeNull();
    expect(checkStageRequirements("Proposal", ["Value", "Region"])).toBe(
      "To move to Proposal, fill in: Value, Region. Open the deal to add them.",
    );
  });
});
