"use client";

import { History } from "lucide-react";

import { DataTable, type Column } from "@/components/dashboard/data-table/data-table";
import { DataTablePagination } from "@/components/dashboard/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/dashboard/data-table/data-table-toolbar";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Badge } from "@/components/dashboard/ui/badge";
import { Button } from "@/components/dashboard/ui/button";
import { formatDate } from "@/lib/format";
import type { Page } from "@/lib/pagination";
import { hasActiveFilters } from "@/lib/table-params";
import { AUDIT_TABLE } from "../table";
import { AUDIT_ENTITIES, type AuditRow } from "../types";

const columns: Column<AuditRow>[] = [
  {
    id: "when",
    header: "When",
    sortable: true,
    className: "whitespace-nowrap",
    cell: (row) => (
      <time dateTime={row.at} className="text-muted-foreground">
        {formatDate(row.at, { dateStyle: "medium", timeStyle: "short" })}
      </time>
    ),
  },
  { id: "actor", header: "Who", hideBelow: "sm", cell: (row) => <span className="font-medium">{row.actor}</span> },
  { id: "summary", header: "What happened", cell: (row) => row.summary },
  {
    id: "entity",
    header: "Type",
    hideBelow: "md",
    cell: (row) => <Badge variant="outline">{row.entity}</Badge>,
  },
];

export function AuditTable({ page }: { page: Page<AuditRow> }) {
  const table = useTableParams(AUDIT_TABLE);
  const filtered = hasActiveFilters(table.params);

  return (
    <div className="bg-card rounded-xl border">
      <DataTableToolbar
        search={table.params.q}
        onSearchChange={table.setSearch}
        searchLabel="Search the audit log"
        searchPlaceholder="Search what happened or who did it…"
        filters={[
          {
            id: "entity",
            label: "Type",
            allLabel: "All types",
            options: AUDIT_ENTITIES.map((entity) => ({ value: entity, label: entity })),
          },
        ]}
        filterValues={table.params.filters}
        onFilterChange={table.setFilter}
        canClear={filtered}
        onClear={table.clear}
      />
      <DataTable
        columns={columns}
        rows={page.items}
        getRowId={(row) => row.id}
        caption="Audit log, newest first"
        sort="when"
        direction={table.params.dir}
        onSortChange={(_, dir) => table.setSort("when", dir)}
        empty={
          <EmptyState
            icon={History}
            title={filtered ? "Nothing matches those filters" : "No activity yet"}
            description={filtered ? "Try a different search or clear the filters." : "Changes made in the dashboard will appear here."}
            action={filtered ? <Button variant="outline" onClick={table.clear}>Clear filters</Button> : undefined}
          />
        }
      />
      <DataTablePagination page={page} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} />
    </div>
  );
}
