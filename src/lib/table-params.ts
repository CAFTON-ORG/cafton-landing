import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "./pagination";

export type SortDirection = "asc" | "desc";

/** What a list view reads from the URL. The URL is the source of truth, so a
 * filtered, sorted page can be bookmarked, shared and survives a reload. */
export type TableParams = {
  q: string;
  /** Filter id → selected value ("" means "all"). */
  filters: Record<string, string>;
  sort: string;
  dir: SortDirection;
  page: number;
  pageSize: number;
};

export type TableParamsConfig = {
  /** Allowed values per filter; anything else in the URL is ignored. */
  filters?: Record<string, readonly string[]>;
  /** Filters that accept any short value (for example a tag), not a fixed list. */
  free?: readonly string[];
  /**
   * Filters whose ids start with this prefix are accepted too, for filters that are data (a custom
   * field's id is only known from the database). The value is kept as typed, up to 60 characters;
   * the caller checks it against what that filter allows.
   */
  prefixed?: string;
  /** Sortable column ids. */
  sortable: readonly string[];
  defaultSort: { sort: string; dir: SortDirection };
};

type SearchParamsLike = {
  get(name: string): string | null;
  entries(): IterableIterator<[string, string]>;
};

/** Parse and sanitise untrusted URL params into a valid `TableParams`. */
export function parseTableParams(
  searchParams: SearchParamsLike,
  config: TableParamsConfig,
): TableParams {
  const sort = searchParams.get("sort") ?? "";
  const dir = searchParams.get("dir");
  const page = Number.parseInt(searchParams.get("page") ?? "", 10);
  const pageSize = Number.parseInt(searchParams.get("pageSize") ?? "", 10);

  const filters: Record<string, string> = {};
  for (const [id, allowed] of Object.entries(config.filters ?? {})) {
    const value = searchParams.get(id) ?? "";
    filters[id] = allowed.includes(value) ? value : "";
  }

  for (const id of config.free ?? []) {
    filters[id] = (searchParams.get(id) ?? "").trim().toLowerCase().slice(0, 40);
  }

  if (config.prefixed) {
    for (const [name, raw] of searchParams.entries()) {
      if (!name.startsWith(config.prefixed) || !/^[a-z][a-z0-9_]{0,60}$/.test(name)) continue;
      const value = raw.trim().slice(0, 60);
      if (value) filters[name] = value;
    }
  }

  const validSort = config.sortable.includes(sort);
  return {
    q: (searchParams.get("q") ?? "").slice(0, 100),
    filters,
    sort: validSort ? sort : config.defaultSort.sort,
    dir: validSort ? (dir === "desc" ? "desc" : "asc") : config.defaultSort.dir,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
  };
}

/** Serialise params back to a query string, omitting defaults to keep URLs short. */
export function toSearchString(params: TableParams, config: TableParamsConfig) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  for (const [id, value] of Object.entries(params.filters)) if (value) search.set(id, value);
  if (params.sort !== config.defaultSort.sort || params.dir !== config.defaultSort.dir) {
    search.set("sort", params.sort);
    search.set("dir", params.dir);
  }
  if (params.page > 1) search.set("page", String(params.page));
  if (params.pageSize !== DEFAULT_PAGE_SIZE) search.set("pageSize", String(params.pageSize));
  return search.toString();
}

/** True when any search or filter narrows the list (drives the "Clear filters" button). */
export function hasActiveFilters(params: TableParams) {
  return !!params.q || Object.values(params.filters).some(Boolean);
}

/** Next.js hands pages `searchParams` as a plain record; the parser wants `.get()`. */
export function searchParamsFromRecord(
  record: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") search.set(key, value);
    else if (Array.isArray(value) && value[0] !== undefined) search.set(key, value[0]);
  }
  return search;
}
