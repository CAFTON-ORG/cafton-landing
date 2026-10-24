/** A page of results, the shape every list endpoint and list service returns. */
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export const PAGE_SIZES = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

/** Slice an already-filtered, already-sorted list into one page (clamping the page). */
export function paginate<T>(rows: T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    total: rows.length,
    page: current,
    pageSize,
    pageCount,
  };
}

export type PageItem = number | "ellipsis-start" | "ellipsis-end";

/**
 * The numbered buttons to show: always the first and last page, the current page
 * and `siblings` either side, with ellipses for the gaps. Stable length so the
 * control does not jump around while paging: `[1 … 4 5 6 … 20]`.
 */
export function getPageItems(page: number, pageCount: number, siblings = 1): PageItem[] {
  const maxSlots = siblings * 2 + 5; // first, last, current ± siblings, two ellipses
  if (pageCount <= maxSlots) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const left = Math.max(page - siblings, 1);
  const right = Math.min(page + siblings, pageCount);
  const showStartEllipsis = left > 2;
  const showEndEllipsis = right < pageCount - 1;
  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);

  if (!showStartEllipsis) return [...range(1, siblings * 2 + 3), "ellipsis-end", pageCount];
  if (!showEndEllipsis)
    return [1, "ellipsis-start", ...range(pageCount - (siblings * 2 + 2), pageCount)];
  return [1, "ellipsis-start", ...range(left, right), "ellipsis-end", pageCount];
}

/** "1–10 of 42" for the results summary. */
export function getRangeLabel(page: Page<unknown>) {
  if (page.total === 0) return "0 results";
  const from = (page.page - 1) * page.pageSize + 1;
  const to = Math.min(page.page * page.pageSize, page.total);
  return `${from}–${to} of ${page.total}`;
}
