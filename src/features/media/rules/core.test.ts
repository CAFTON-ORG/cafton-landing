import { describe, expect, it } from "vitest";

import { checkAltText, checkDeleteMedia } from "./core";

describe("checkDeleteMedia", () => {
  it("blocks deleting an image that content still uses, with a correct plural", () => {
    expect(checkDeleteMedia({ uses: 0 })).toBeNull();
    expect(checkDeleteMedia({ uses: 1 })).toMatch(/1 place\./);
    expect(checkDeleteMedia({ uses: 3 })).toMatch(/3 places\./);
  });
});

describe("checkAltText", () => {
  it("accepts a description and an empty value, and refuses file names and essays", () => {
    expect(checkAltText("Two engineers reviewing a dashboard")).toBeNull();
    expect(checkAltText("")).toBeNull();
    expect(checkAltText("IMG_1234.jpg")).toMatch(/not its file name/);
    expect(checkAltText("photo")).toMatch(/not its file name/);
    expect(checkAltText("x".repeat(301))).toMatch(/under 300/);
  });
});
