import { describe, expect, it } from "vitest";

import { withCurrent } from "./options";

const LIST = ["project", "hour", "day"] as const;

describe("withCurrent", () => {
  it("keeps a value that is not on the list, so an older record never changes", () => {
    expect(withCurrent(LIST, "sprint")).toEqual(["project", "hour", "day", "sprint"]);
  });

  it("does not repeat a value already on the list, or add an empty one", () => {
    expect(withCurrent(LIST, "hour")).toEqual(["project", "hour", "day"]);
    expect(withCurrent(LIST, "")).toEqual(["project", "hour", "day"]);
  });
});
