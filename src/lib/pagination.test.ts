import { describe, expect, it } from "vitest";
import { getPageItems, getRangeLabel, paginate } from "./pagination";

describe("paginate", () => {
  const rows = Array.from({ length: 25 }, (_, i) => i + 1);

  it("slices a page and reports totals", () => {
    const page = paginate(rows, 2, 10);
    expect(page.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(page).toMatchObject({ total: 25, page: 2, pageSize: 10, pageCount: 3 });
  });

  it("clamps out-of-range pages", () => {
    expect(paginate(rows, 99, 10).page).toBe(3);
    expect(paginate(rows, 0, 10).page).toBe(1);
  });

  it("always has at least one page, even when empty", () => {
    expect(paginate([], 1, 10)).toMatchObject({ items: [], total: 0, page: 1, pageCount: 1 });
  });
});

describe("getPageItems", () => {
  it("lists every page when there are few", () => {
    expect(getPageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses the far end near the start", () => {
    expect(getPageItems(1, 20)).toEqual([1, 2, 3, 4, 5, "ellipsis-end", 20]);
  });

  it("collapses both ends in the middle", () => {
    expect(getPageItems(10, 20)).toEqual([1, "ellipsis-start", 9, 10, 11, "ellipsis-end", 20]);
  });

  it("collapses the near end near the finish", () => {
    expect(getPageItems(20, 20)).toEqual([1, "ellipsis-start", 16, 17, 18, 19, 20]);
  });
});

describe("getRangeLabel", () => {
  it("describes the visible range", () => {
    expect(getRangeLabel(paginate(Array(25).fill(0), 3, 10))).toBe("21–25 of 25");
    expect(getRangeLabel(paginate([], 1, 10))).toBe("0 results");
  });
});
