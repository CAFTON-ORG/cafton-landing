"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import { Skeleton } from "@/components/dashboard/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/dashboard/ui/table";
import type { SortDirection } from "@/lib/table-params";
import { cn } from "@/lib/utils";

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "right";
  className?: string;
  /** Hide this column below a breakpoint so the table fits phones. */
  hideBelow?: "sm" | "md" | "lg" | "xl";
};

const HIDE_BELOW = {
  sm: "max-sm:hidden",
  md: "max-md:hidden",
  lg: "max-lg:hidden",
  xl: "max-xl:hidden",
} as const;

const columnClass = (column: Pick<Column<never>, "align" | "hideBelow" | "className">) =>
  cn(
    column.align === "right" && "text-right",
    column.hideBelow && HIDE_BELOW[column.hideBelow],
    column.className,
  );

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <Button variant="ghost" size="sm" className="-ml-2.5 h-8 px-2.5" onClick={onClick}>
      {label}
      <Icon className={cn("size-3.5", !active && "text-muted-foreground")} aria-hidden="true" />
    </Button>
  );
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  loading = false,
  fetching = false,
  skeletonRows = 8,
  sort,
  direction,
  onSortChange,
  selected,
  onSelectedChange,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Screen-reader name for the table. */
  caption: string;
  /** First load: show skeleton rows. */
  loading?: boolean;
  /** Refetching (new page, filter): keep rows, dim them. */
  fetching?: boolean;
  skeletonRows?: number;
  sort?: string;
  direction?: SortDirection;
  onSortChange?: (column: string, direction: SortDirection) => void;
  /** Provide both to enable row selection. */
  selected?: ReadonlySet<string>;
  onSelectedChange?: (ids: Set<string>) => void;
  /** Shown instead of the body when there are no rows. */
  empty?: ReactNode;
}) {
  const selectable = !!selected && !!onSelectedChange;
  const pageIds = rows.map(getRowId);
  const selectedOnPage = pageIds.filter((id) => selected?.has(id)).length;
  const allSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;
  const someSelected = selectedOnPage > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    for (const id of pageIds) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    onSelectedChange(next);
  }

  function toggleRow(id: string, checked: boolean) {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectedChange(next);
  }

  const colSpan = columns.length + (selectable ? 1 : 0);

  return (
    <div
      className={cn("transition-opacity", fetching && !loading && "opacity-60")}
      aria-busy={loading || fetching}
    >
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {selectable && (
              <TableHead scope="col" className="w-10">
                <Checkbox
                  className="size-6"
                  aria-label="Select all rows on this page"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                  disabled={loading || rows.length === 0}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.id}
                scope="col"
                className={columnClass(column)}
                aria-sort={
                  column.sortable && sort === column.id
                    ? direction === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {column.sortable && onSortChange ? (
                  <SortButton
                    label={column.header}
                    active={sort === column.id}
                    direction={direction ?? "asc"}
                    onClick={() =>
                      onSortChange(
                        column.id,
                        sort === column.id && direction === "asc" ? "desc" : "asc",
                      )
                    }
                  />
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading &&
            Array.from({ length: skeletonRows }, (_, row) => (
              <TableRow key={row} className="hover:bg-transparent">
                {Array.from({ length: colSpan }, (_, cell) => (
                  <TableCell
                    key={cell}
                    className={
                      cell > 0 ? columnClass(columns[cell - (selectable ? 1 : 0)]) : undefined
                    }
                  >
                    <Skeleton className="h-4 w-full max-w-40" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!loading &&
            rows.map((row) => {
              const id = getRowId(row);
              const isSelected = !!selected?.has(id);
              return (
                <TableRow key={id} data-state={isSelected ? "selected" : undefined}>
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        className="size-6"
                        aria-label={`Select row ${id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleRow(id, checked === true)}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.id} className={columnClass(column)}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
        </TableBody>
      </Table>

      {!loading && rows.length === 0 && empty}
    </div>
  );
}
