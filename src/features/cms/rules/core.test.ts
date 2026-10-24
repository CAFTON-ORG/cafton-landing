import { describe, expect, it } from "vitest";

import {
  checkDeleteContent,
  checkPublishPost,
  isSafeImageSrc,
  isValidSlug,
  paragraphsFromText,
  slugify,
  textFromParagraphs,
} from "./core";

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

describe("links and lists", () => {
  it("accepts paths and https links only", async () => {
    const { isSafeHref, listFromCommas, listFromText, textFromList } = await import("./core");
    expect(isSafeHref("/events/some-event")).toBe(true);
    expect(isSafeHref("https://gleam.io/abc")).toBe(true);
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("//evil.example")).toBe(false);
    expect(listFromText("Certificate\n\n  Sash \n")).toEqual(["Certificate", "Sash"]);
    expect(listFromText(textFromList(["A", "B"]))).toEqual(["A", "B"]);
    expect(listFromCommas("Sponsor,  Technology partner ,")).toEqual([
      "Sponsor",
      "Technology partner",
    ]);
  });
});

describe("Manila time", () => {
  it("converts a datetime-local value to an ISO timestamp with the +08:00 offset and back", async () => {
    const { isoToManila, manilaToIso } = await import("./core");
    expect(manilaToIso("2026-10-01T09:00")).toBe("2026-10-01T09:00:00+08:00");
    expect(new Date(manilaToIso("2026-10-01T09:00")!).toISOString()).toBe(
      "2026-10-01T01:00:00.000Z",
    );
    expect(isoToManila("2026-10-01T01:00:00.000Z")).toBe("2026-10-01T09:00");
    expect(isoToManila(manilaToIso("2026-12-31T23:30")!)).toBe("2026-12-31T23:30");
    expect(manilaToIso("not a date")).toBeNull();
    expect(manilaToIso("")).toBeNull();
    expect(manilaToIso("2026-13-45T25:61")).toBeNull();
  });

  it("will not let an event end before it starts", async () => {
    const { checkEventDates } = await import("./core");
    expect(checkEventDates("2026-10-02T00:00:00+08:00", "2026-10-01T00:00:00+08:00")).toMatch(
      /can't end before/,
    );
    expect(checkEventDates("2026-10-01T00:00:00+08:00", "2026-10-02T00:00:00+08:00")).toBeNull();
    expect(checkEventDates("2026-10-01T00:00:00+08:00", null)).toBeNull();
  });
});

describe("publish completeness for projects, events and partners", () => {
  it("names what is missing", async () => {
    const { checkPublishEvent, checkPublishPartner, checkPublishProject } = await import("./core");
    const project = { title: "T", client: "C", summary: "S", description: "D" };
    expect(checkPublishProject(project)).toBeNull();
    expect(checkPublishProject({ ...project, summary: "" })).toMatch(/summary/);
    expect(checkPublishProject({ ...project, client: "" })).toMatch(/client/);
    expect(checkPublishProject({ ...project, imageLight: "/a.jpg" })).toMatch(/alt text/);

    const event = { title: "T", tagline: "G", summary: "S", prizeCount: 1 };
    expect(checkPublishEvent(event)).toBeNull();
    expect(checkPublishEvent({ ...event, prizeCount: 0 })).toMatch(/prize/);

    expect(checkPublishPartner({ name: "N", shortName: "n", logoSrc: "/x.png" })).toBeNull();
    expect(checkPublishPartner({ name: "N", shortName: "n", logoSrc: "" })).toMatch(/logo/);
  });
});
