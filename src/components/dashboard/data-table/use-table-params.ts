"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  parseTableParams,
  toSearchString,
  type SortDirection,
  type TableParams,
  type TableParamsConfig,
} from "@/lib/table-params";

/**
 * Table state kept in the URL (`?q=&status=&sort=&dir=&page=`), so views can be
 * bookmarked, shared and survive a reload, and Back/Forward work. Any change to
 * the search or a filter returns to page 1. Declare `config` at module scope so
 * it is a stable reference.
 */
export function useTableParams(config: TableParamsConfig) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo(() => parseTableParams(searchParams, config), [searchParams, config]);

  const update = useCallback(
    (patch: Partial<TableParams>, options: { resetPage?: boolean } = {}) => {
      const next: TableParams = {
        ...params,
        ...patch,
        filters: { ...params.filters, ...patch.filters },
        page: options.resetPage ? 1 : (patch.page ?? params.page),
      };
      const search = toSearchString(next, config);
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [params, config, pathname, router],
  );

  return {
    params,
    setSearch: (q: string) => update({ q }, { resetPage: true }),
    setFilter: (id: string, value: string) =>
      update({ filters: { [id]: value } }, { resetPage: true }),
    setSort: (sort: string, dir: SortDirection) => update({ sort, dir }, { resetPage: true }),
    setPage: (page: number) => update({ page }),
    setPageSize: (pageSize: number) => update({ pageSize }, { resetPage: true }),
    clear: () =>
      update(
        { q: "", filters: Object.fromEntries(Object.keys(params.filters).map((id) => [id, ""])) },
        { resetPage: true },
      ),
  };
}
