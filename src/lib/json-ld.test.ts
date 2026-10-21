import { describe, expect, it } from "vitest";

import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  it("cannot be broken out of with a closing script tag", () => {
    const hostile = { name: '</script><script>alert(1)</script><img src=x onerror="alert(2)">' };
    const out = serializeJsonLd(hostile);
    expect(out).not.toMatch(/<|>/);
    expect(out.toLowerCase()).not.toContain("</script");
  });

  it("still round-trips to exactly the same data", () => {
    const data = { "@type": "Article", headline: "A & B <3   line", list: [1, "two", { three: true }] };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it("leaves no raw line or paragraph separator in the output", () => {
    const out = serializeJsonLd({ x: "a" + String.fromCharCode(0x2028) + "b" + String.fromCharCode(0x2029) });
    expect(out.includes(String.fromCharCode(0x2028))).toBe(false);
    expect(out.includes(String.fromCharCode(0x2029))).toBe(false);
  });

  it("escapes HTML comment openers", () => {
    expect(serializeJsonLd({ x: "<!-- hi" })).not.toContain("<!--");
  });
});
