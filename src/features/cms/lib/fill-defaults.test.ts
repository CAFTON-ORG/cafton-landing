import { describe, expect, it } from "vitest";

import { fillDefaults } from "./fill-defaults";

describe("fillDefaults", () => {
  it("adds a field the stored document predates, at any depth", () => {
    const bundled = { a: "x", hero: { title: "T", cta: "Go" }, list: [1, 2] };
    const stored = { a: "edited", hero: { title: "Mine" }, list: [9] };
    expect(fillDefaults(stored, bundled)).toEqual({
      a: "edited",
      hero: { title: "Mine", cta: "Go" },
      list: [9],
    });
  });

  it("keeps stored values, including empty ones, and extra keys", () => {
    expect(fillDefaults({ a: "", extra: 1 }, { a: "x" })).toEqual({ a: "", extra: 1 });
  });

  it("leaves a stored value of the wrong kind for the schema to reject", () => {
    expect(fillDefaults({ a: "text" }, { a: { b: 1 } })).toEqual({ a: "text" });
    expect(fillDefaults(null, { a: 1 })).toBeNull();
  });
});
