"use client";

import Link from "next/link";
import { FileSignature, Handshake } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { IconTile } from "@/components/dashboard/shared/icon-tile";
import { Person } from "@/components/dashboard/shared/person";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import type { Page } from "@/lib/pagination";
import { QUOTE_STATUSES, QUOTE_STATUS_LABEL } from "../rules/core";
import { QUOTES_TABLE } from "../table";
import type { QuoteRow } from "../types";
import { QuoteStatusBadge } from "./quote-status-badge";

const columns: Column<QuoteRow>[] = [
  {
    id: "reference",
    header: "Quote",
    sortable: true,
    cell: (quote) => (
      <div className="flex min-w-0 items-center gap-3">
        <IconTile icon={FileSignature} />
        <div className="min-w-0">
          <Link
            href={`/dashboard/sales/quotes/${quote.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {quote.reference}
            {quote.version > 1 && <span className="text-muted-foreground"> v{quote.version}</span>}
          </Link>
          <p className="text-muted-foreground truncate text-xs">{quote.title}</p>
        </div>
      </div>
    ),
  },
  {
    id: "deal",
    header: "Deal",
    hideBelow: "md",
    cell: (quote) => (
      <div className="flex min-w-0 items-center gap-3">
        <IconTile icon={Handshake} />
        <div className="min-w-0">
          <Link
            href={`/dashboard/crm/deals/${quote.dealId}`}
            className="underline-offset-4 hover:underline"
          >
            {quote.dealTitle}
          </Link>
          <Person
            name={quote.contactName}
            size="sm"
            className="text-muted-foreground mt-0.5 text-xs"
          />
        </div>
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    sortable: true,
    cell: (quote) => <QuoteStatusBadge status={quote.status} />,
  },
  {
    id: "total",
    header: "Total",
    sortable: true,
    align: "right",
    cell: (quote) => (
      <span className="tabular-nums">{formatMinor(quote.totalMinor, quote.currency)}</span>
    ),
  },
  {
    id: "valid",
    header: "Valid until",
    hideBelow: "lg",
    cell: (quote) =>
      quote.validUntil ? (
        formatDate(quote.validUntil)
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "created",
    header: "Made",
    sortable: true,
    hideBelow: "lg",
    cell: (quote) => <span className="text-muted-foreground">{formatDate(quote.createdAt)}</span>,
  },
];

export function QuotesTable({ page }: { page: Page<QuoteRow> }) {
  const table = useTableParams(QUOTES_TABLE);
  return (
    <ResourceTable
      table={table}
      page={page}
      columns={columns}
      getRowId={(quote) => quote.id}
      caption="Quotes"
      searchLabel="Search quotes"
      searchPlaceholder="Search by number, title, deal or client…"
      filters={[
        {
          id: "status",
          label: "Status",
          allLabel: "Current quotes",
          options: QUOTE_STATUSES.map((status) => ({
            value: status,
            label: QUOTE_STATUS_LABEL[status],
          })),
        },
      ]}
      emptyIcon={FileSignature}
      emptyTitle="No quotes yet"
      emptyDescription="Open a deal and choose New quote. It appears here once it is started."
    />
  );
}
