import { describe, expect, it } from "vitest";
import { hasActiveFilters, parseTableParams, toSearchString, type TableParamsConfig } from "./table-params";

const config: TableParamsConfig = {
  filters: { status: ["active", "paused"] },
  sortable: ["name", "budget"],
  defaultSort: { sort: "name", dir: "asc" },
};
const parse = (query: string) => parseTableParams(new URLSearchParams(query), config);

describe("parseTableParams", () => {
  it("returns defaults for an empty URL", () => {
    expect(parse("")).toEqual({
      q: "",
      filters: { status: "" },
      sort: "name",
      dir: "asc",
      page: 1,
      pageSize: 10,
    });
  });

  it("reads valid values", () => {
    expect(parse("q=ada&status=paused&sort=budget&dir=desc&page=3&pageSize=25")).toEqual({
      q: "ada",
      filters: { status: "paused" },
      sort: "budget",
      dir: "desc",
      page: 3,
      pageSize: 25,
    });
  });

  it("ignores anything it does not recognise", () => {
    const params = parse("status=hacked&sort=password&dir=sideways&page=-4&pageSize=9999");
    expect(params).toMatchObject({ filters: { status: "" }, sort: "name", dir: "asc", page: 1, pageSize: 10 });
  });

  it("caps the search length", () => {
    expect(parse(`q=${"x".repeat(500)}`).q).toHaveLength(100);
  });
});

describe("toSearchString", () => {
  it("omits defaults so URLs stay short", () => {
    expect(toSearchString(parse(""), config)).toBe("");
  });

  it("round-trips non-default state", () => {
    const query = "q=ada&status=active&sort=budget&dir=desc&page=2&pageSize=25";
    expect(new URLSearchParams(toSearchString(parse(query), config)).toString()).toBe(
      new URLSearchParams(query).toString(),
    );
  });
});

describe("hasActiveFilters", () => {
  it("is true for a search or a filter", () => {
    expect(hasActiveFilters(parse(""))).toBe(false);
    expect(hasActiveFilters(parse("q=a"))).toBe(true);
    expect(hasActiveFilters(parse("status=active"))).toBe(true);
  });
});
