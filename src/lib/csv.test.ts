import { describe, expect, it } from "vitest";

import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(toCsv(["a", "b"], [['x, "y"', "line\nbreak"]])).toBe(
      '﻿a,b\r\n"x, ""y""","line\nbreak"\r\n',
    );
  });

  it("defuses cells that a spreadsheet would run as a formula", () => {
    const body = toCsv(["n"], [['=HYPERLINK("http://evil")'], ["+1"], ["-2"], ["@x"], ["fine"]]);
    expect(body).toContain("'=HYPERLINK");
    expect(body).toContain("'+1");
    expect(body).toContain("'-2");
    expect(body).toContain("'@x");
    expect(body).toContain("\r\nfine\r\n");
  });

  it("writes empty cells for missing values", () => {
    expect(toCsv(["a", "b"], [[null, undefined]])).toBe("﻿a,b\r\n,\r\n");
  });
});

import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("reads quoted commas, quotes and line breaks", () => {
    expect(parseCsv('a,b\r\n"x, ""y""","line\nbreak"\r\n')).toEqual([
      ["a", "b"],
      ['x, "y"', "line\nbreak"],
    ]);
  });

  it("ignores the byte-order mark and blank lines, and reads a last line without a break", () => {
    expect(parseCsv("﻿a,b\n\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("round-trips what toCsv writes", () => {
    const rows = [
      ["name", "note"],
      ["Ada, Lovelace", 'said "hi"\nbye'],
    ];
    expect(parseCsv(toCsv(rows[0] as string[], [rows[1]]))).toEqual(rows);
  });
});
