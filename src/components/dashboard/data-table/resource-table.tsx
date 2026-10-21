"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Button } from "@/components/dashboard/ui/button";
import { Card } from "@/components/dashboard/ui/card";
import type { Page } from "@/lib/pagination";
import { hasActiveFilters } from "@/lib/table-params";
import { DataTable, type Column } from "./data-table";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar, type FilterConfig } from "./data-table-toolbar";
import type { useTableParams } from "./use-table-params";

export type TableController = ReturnType<typeof useTableParams>;

/**
 * The whole list screen in one component: a card holding the URL-driven toolbar
 * (search, filters, clear), the table, the pager and every state a list has:
 * loading skeleton, refetching, error with retry, empty, and "filtered to nothing".
 *
 * It is controlled. The caller owns `useTableParams` because it needs the
 * parsed params to fetch (a hook in API mode, a server query in monolith mode),
 * then hands the same `table` and the resulting `page` back. A feature supplies
 * columns and copy; it never wires toolbar, table and pager by hand.
 *
 * - `page` is undefined until the first result arrives (pair it with `loading`).
 * - `selection` + `bulkBar` add row selection and the bar shown while rows are selected.
 */
export function ResourceTable<T>({
  table,
  page,
  columns,
  getRowId,
  caption,
  searchLabel,
  searchPlaceholder,
  filters,
  actions,
  loading = false,
  fetching = false,
  skeletonRows,
  error,
  selection,
  bulkBar,
  emptyIcon,
  emptyTitle,
  emptyFilteredTitle = "Nothing matches those filters",
  emptyDescription,
  emptyAction,
  children,
}: {
  table: TableController;
  page?: Page<T>;
  columns: Column<T>[];
  getRowId: (row: T) => string;
  /** Screen-reader name for the table. */
  caption: string;
  searchLabel: string;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  /** Buttons at the end of the toolbar, e.g. "Add contact". */
  actions?: ReactNode;
  /** First load: show skeleton rows. */
  loading?: boolean;
  /** Refetching (new page, filter): keep the rows, dim them. */
  fetching?: boolean;
  skeletonRows?: number;
  /** Replaces the table with a message and a retry button. */
  error?: { title: string; description: string; onRetry?: () => void };
  selection?: { selected: ReadonlySet<string>; onChange: (ids: Set<string>) => void };
  /** Shown above the table while `selection.selected` is not empty. */
  bulkBar?: ReactNode;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  /** Title when search or filters hide every row, e.g. "No projects match". */
  emptyFilteredTitle?: string;
  emptyDescription: string;
  /** Shown when the list is genuinely empty (not when filters hide everything). */
  emptyAction?: ReactNode;
  /** Extra content inside the card, below the pager (e.g. a confirm dialog). */
  children?: ReactNode;
}) {
  const { params } = table;
  const filtered = hasActiveFilters(params);
  const hasSelection = (selection?.selected.size ?? 0) > 0;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <DataTableToolbar
        search={params.q}
        onSearchChange={table.setSearch}
        searchLabel={searchLabel}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        filterValues={params.filters}
        onFilterChange={table.setFilter}
        canClear={filtered}
        onClear={table.clear}
        actions={actions}
      />

      {hasSelection && bulkBar && (
        <div
          className="bg-muted/50 flex items-center justify-between gap-2 border-y px-4 py-2"
          role="status"
        >
          <span className="text-sm font-medium">{selection?.selected.size} selected</span>
          <div className="flex items-center gap-2">{bulkBar}</div>
        </div>
      )}

      {error ? (
        <EmptyState
          title={error.title}
          description={error.description}
          action={
            error.onRetry && (
              <Button variant="outline" onClick={error.onRetry}>
                Try again
              </Button>
            )
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={page?.items ?? []}
          getRowId={getRowId}
          caption={caption}
          loading={loading}
          fetching={fetching}
          skeletonRows={skeletonRows ?? Math.min(params.pageSize, 10)}
          sort={params.sort}
          direction={params.dir}
          onSortChange={table.setSort}
          selected={selection?.selected}
          onSelectedChange={selection?.onChange}
          empty={
            <EmptyState
              icon={emptyIcon}
              title={filtered ? emptyFilteredTitle : emptyTitle}
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
      )}

      {page && page.total > 0 && (
        <DataTablePagination
          page={page}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
        />
      )}

      {children}
    </Card>
  );
}
