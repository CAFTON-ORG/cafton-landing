import { describe, expect, it } from "vitest";

import { MAX_TAGS, normalizeTags, parseTagList } from "./tags";

describe("tags", () => {
  it("trims, lower-cases and drops repeats", () => {
    expect(normalizeTags([" VIP ", "vip", "Follow   Up", ""])).toEqual(["vip", "follow up"]);
  });

  it("splits a typed or imported list", () => {
    expect(parseTagList("vip, baguio;warm\nschool")).toEqual(["vip", "baguio", "warm", "school"]);
  });

  it("caps the length and the count", () => {
    expect(normalizeTags(["x".repeat(80)])[0]).toHaveLength(30);
    expect(normalizeTags(Array.from({ length: 40 }, (_, i) => `t${i}`))).toHaveLength(MAX_TAGS);
  });
});
