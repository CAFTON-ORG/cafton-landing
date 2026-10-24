"use client";

import Link from "next/link";
import { ScrollText } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { formatDate } from "@/lib/format";
import type { Page } from "@/lib/pagination";
import { JOURNAL_SOURCES, JOURNAL_SOURCE_LABEL, JOURNAL_TABLE } from "../table";
import type { JournalRow } from "../types/core";
import { Money } from "./money";

const columns: Column<JournalRow>[] = [
  {
    id: "number",
    header: "Entry",
    sortable: true,
    cell: (entry) => (
      <div className="min-w-0">
        <Link
          href={`/dashboard/finance/journal/${entry.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {entry.number}
        </Link>
        <p className="text-muted-foreground line-clamp-1 text-xs">{entry.memo}</p>
      </div>
    ),
  },
  {
    id: "date",
    header: "Date",
    sortable: true,
    cell: (entry) => formatDate(entry.entryDate),
  },
  {
    id: "source",
    header: "From",
    hideBelow: "md",
    cell: (entry) => (
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground text-sm">
          {JOURNAL_SOURCE_LABEL[entry.sourceKind as keyof typeof JOURNAL_SOURCE_LABEL] ??
            entry.sourceKind}
        </span>
        {entry.reversedByNumber && <StatusBadge tone="neutral">Reversed</StatusBadge>}
      </span>
    ),
  },
  {
    id: "amount",
    header: "Amount",
    align: "right",
    cell: (entry) => <Money minor={entry.totalMinor} />,
  },
  {
    id: "by",
    header: "Posted by",
    hideBelow: "lg",
    cell: (entry) => <span className="text-muted-foreground">{entry.createdByName}</span>,
  },
];

export function JournalTable({ page }: { page: Page<JournalRow> }) {
  const table = useTableParams(JOURNAL_TABLE);
  return (
    <ResourceTable
      table={table}
      page={page}
      columns={columns}
      getRowId={(entry) => entry.id}
      caption="Journal entries"
      searchLabel="Search the journal"
      searchPlaceholder="Search by number, memo or account…"
      filters={[
        {
          id: "source",
          label: "From",
          allLabel: "Anything",
          options: JOURNAL_SOURCES.map((source) => ({
            value: source,
            label: JOURNAL_SOURCE_LABEL[source],
          })),
        },
      ]}
      emptyIcon={ScrollText}
      emptyTitle="No entries yet"
      emptyDescription="Every posting lands here: invoices, payments, bills and entries made by hand."
    />
  );
}
