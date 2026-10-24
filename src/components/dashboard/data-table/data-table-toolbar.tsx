"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export type FilterConfig = {
  id: string;
  label: string;
  /** Shown for the "no filter" option, e.g. "All statuses". */
  allLabel: string;
  options: { value: string; label: string }[];
};

const ALL = "__all__";

/** Search box + filter dropdowns + clear. Search is debounced; filters apply immediately. */
export function DataTableToolbar({
  search,
  onSearchChange,
  searchLabel,
  searchPlaceholder = "Search…",
  filters = [],
  filterValues,
  onFilterChange,
  canClear,
  onClear,
  actions,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  filterValues: Record<string, string>;
  onFilterChange: (id: string, value: string) => void;
  canClear: boolean;
  onClear: () => void;
  actions?: ReactNode;
}) {
  // Local text so typing is instant; the URL (and the request) only update once typing pauses.
  const [text, setText] = useState(search);
  const debounced = useDebouncedValue(text, 300);

  useEffect(() => {
    if (debounced !== search) onSearchChange(debounced);
    // Only react to the debounced value; `search` changes come from the URL and are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    // External change (Back button, "Clear filters"): mirror it into the input.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(search);
  }, [search]);

  return (
    <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          className="h-9 pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <Select
            key={filter.id}
            value={filterValues[filter.id] || ALL}
            onValueChange={(value) => onFilterChange(filter.id, value === ALL ? "" : String(value))}
          >
            <SelectTrigger aria-label={filter.label} className="h-9 min-w-36">
              <SelectValue>
                {(value: string) =>
                  value === ALL
                    ? filter.allLabel
                    : (filter.options.find((o) => o.value === value)?.label ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{filter.allLabel}</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {canClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X aria-hidden="true" /> Clear
          </Button>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 sm:ml-auto">{actions}</div>}
    </div>
  );
}
