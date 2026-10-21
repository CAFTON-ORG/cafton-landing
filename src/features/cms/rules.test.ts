import { describe, expect, it } from "vitest";

import {
  checkDeleteContent,
  checkPublishPost,
  isSafeImageSrc,
  isValidSlug,
  paragraphsFromText,
  slugify,
  textFromParagraphs,
} from "./rules";

describe("slugify / isValidSlug", () => {
  it("makes a clean URL segment and drops apostrophes instead of splitting words", () => {
    expect(slugify("Jamil's Mural Arts: the story!")).toBe("jamils-mural-arts-the-story");
    expect(slugify("  Hello   World  ")).toBe("hello-world");
  });

  it("agrees with the database rule", () => {
    expect(isValidSlug("building-iligtas")).toBe(true);
    expect(isValidSlug("Building")).toBe(false);
    expect(isValidSlug("double--hyphen")).toBe(false);
    expect(isValidSlug("-leading")).toBe(false);
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug(slugify("Anything @ all! 123"))).toBe(true);
  });

  it("never ends in a hyphen after truncating", () => {
    expect(slugify(`${"a".repeat(79)} b`).endsWith("-")).toBe(false);
  });
});

describe("paragraphs", () => {
  it("splits on blank lines, joins soft line breaks, and round-trips", () => {
    const text = "First line\ncontinues here.\n\n\nSecond paragraph.\n\n  \nThird.";
    expect(paragraphsFromText(text)).toEqual([
      "First line continues here.",
      "Second paragraph.",
      "Third.",
    ]);
    expect(paragraphsFromText(textFromParagraphs(["A", "B"]))).toEqual(["A", "B"]);
    expect(paragraphsFromText("   \n\n  ")).toEqual([]);
  });
});

describe("checkPublishPost", () => {
  const ready = { title: "T", excerpt: "E", content: ["Body"] };

  it("needs a title, an excerpt and a body", () => {
    expect(checkPublishPost(ready)).toBeNull();
    expect(checkPublishPost({ ...ready, title: " " })).toMatch(/title/);
    expect(checkPublishPost({ ...ready, excerpt: "" })).toMatch(/excerpt/);
    expect(checkPublishPost({ ...ready, content: [] })).toMatch(/Write the article/);
  });

  it("needs alt text whenever a cover image is set", () => {
    expect(checkPublishPost({ ...ready, imageLight: "/a.jpg" })).toMatch(/alt text/);
    expect(checkPublishPost({ ...ready, imageDark: "/a.jpg", imageAlt: "A cat" })).toBeNull();
  });
});

describe("checkDeleteContent", () => {
  it("makes you unpublish before deleting", () => {
    expect(checkDeleteContent({ status: "published" })).toMatch(/Unpublish/);
    expect(checkDeleteContent({ status: "draft" })).toBeNull();
  });
});

describe("isSafeImageSrc", () => {
  it("allows our own paths and https, and nothing that can run script", () => {
    expect(isSafeImageSrc("/images/hero-light.jpg")).toBe(true);
    expect(isSafeImageSrc("https://cdn.example.com/a.png")).toBe(true);
    expect(isSafeImageSrc("//evil.example/a.png")).toBe(false);
    expect(isSafeImageSrc("http://example.com/a.png")).toBe(false);
    expect(isSafeImageSrc("javascript:alert(1)")).toBe(false);
    expect(isSafeImageSrc("data:text/html,<script>")).toBe(false);
    expect(isSafeImageSrc("/a\\b")).toBe(false);
  });
});
