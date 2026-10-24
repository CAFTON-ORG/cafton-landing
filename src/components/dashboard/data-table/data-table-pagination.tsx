"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { PAGE_SIZES, getPageItems, getRangeLabel, type Page } from "@/lib/pagination";

export function DataTablePagination({
  page,
  onPageChange,
  onPageSizeChange,
}: {
  page: Page<unknown>;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const items = getPageItems(page.page, page.pageCount);

  return (
    <div className="flex flex-col items-center gap-3 border-t px-4 py-3 sm:flex-row sm:justify-between">
      <div className="text-muted-foreground flex items-center gap-3 text-sm">
        <span aria-live="polite">{getRangeLabel(page)}</span>
        <label className="flex items-center gap-2">
          <span className="max-sm:sr-only">Rows</span>
          <Select
            value={String(page.pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger size="sm" aria-label="Rows per page" className="w-18">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={page.page <= 1}
          onClick={() => onPageChange(page.page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>

        {/* Numbered buttons need room; on phones the "Page x of y" label is enough. */}
        <ul className="flex items-center gap-1 max-sm:hidden">
          {items.map((item) =>
            typeof item === "number" ? (
              <li key={item}>
                <Button
                  variant={item === page.page ? "default" : "ghost"}
                  size="icon"
                  aria-label={`Page ${item}`}
                  aria-current={item === page.page ? "page" : undefined}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </Button>
              </li>
            ) : (
              <li key={item} aria-hidden="true" className="text-muted-foreground w-8 text-center">
                …
              </li>
            ),
          )}
        </ul>
        <span className="text-muted-foreground px-2 text-sm sm:hidden">
          Page {page.page} of {page.pageCount}
        </span>

        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={page.page >= page.pageCount}
          onClick={() => onPageChange(page.page + 1)}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </nav>
    </div>
  );
}
