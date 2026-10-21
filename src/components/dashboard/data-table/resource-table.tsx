"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Button } from "@/components/dashboard/ui/button";
import type { Page } from "@/lib/pagination";
import { hasActiveFilters, type TableParamsConfig } from "@/lib/table-params";
import { DataTable, type Column } from "./data-table";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar, type FilterConfig } from "./data-table-toolbar";
import { useTableParams } from "./use-table-params";

/**
 * The whole list screen in one component: URL-driven search, filters, sorting
 * and paging around a table, with an empty state that knows whether the list is
 * empty or just filtered. Features supply columns and copy; they never wire
 * the toolbar, table and pager by hand.
 */
export function ResourceTable<T>({
  config,
  page,
  columns,
  getRowId,
  caption,
  searchLabel,
  searchPlaceholder,
  filters,
  actions,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  /** Declare at module scope (or memoise): it must be a stable reference. */
  config: TableParamsConfig;
  page: Page<T>;
  columns: Column<T>[];
  getRowId: (row: T) => string;
  caption: string;
  searchLabel: string;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  actions?: ReactNode;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  /** Shown when the list is genuinely empty (not when filters hide everything). */
  emptyAction?: ReactNode;
}) {
  const table = useTableParams(config);
  const filtered = hasActiveFilters(table.params);

  return (
    <div className="bg-card rounded-xl border">
      <DataTableToolbar
        search={table.params.q}
        onSearchChange={table.setSearch}
        searchLabel={searchLabel}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        filterValues={table.params.filters}
        onFilterChange={table.setFilter}
        canClear={filtered}
        onClear={table.clear}
        actions={actions}
      />
      <DataTable
        columns={columns}
        rows={page.items}
        getRowId={getRowId}
        caption={caption}
        sort={table.params.sort}
        direction={table.params.dir}
        onSortChange={table.setSort}
        empty={
          <EmptyState
            icon={emptyIcon}
            title={filtered ? "Nothing matches those filters" : emptyTitle}
            description={
              filtered ? "Try a different search or clear the filters." : emptyDescription
            }
            action={
              filtered ? (
                <Button variant="outline" onClick={table.clear}>
                  Clear filters
                </Button>
              ) : (
                emptyAction
              )
            }
          />
        }
      />
      <DataTablePagination
        page={page}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
      />
    </div>
  );
}
